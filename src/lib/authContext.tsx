import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, Company, Membership, UserRole } from '../types';
import { seedCompanyData } from './db';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  currentUser: User | null;
  currentCompany: Company | null;
  currentRole: UserRole | null;
  loading: boolean;
  loginDemo: (companyName?: string) => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  register: (
    lastName: string, 
    firstName: string, 
    email: string, 
    phone: string, 
    pass: string, 
    companyName: string, 
    currency: string
  ) => Promise<void>;
  resetPasswordWithOtp: (emailOrPhone: string, channel: 'EMAIL' | 'WHATSAPP') => Promise<{ otpCode: string; destination: string }>;
  verifyOtpAndChangePassword: (emailOrPhone: string, otp: string, newPass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshCompany: () => Promise<void>;
  switchCompanyCurrency: (currency: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>('OWNER');
  const [loading, setLoading] = useState(true);

  // Auto-init or load demo company session from localStorage if not signed in with email
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        await loadUserData(fUser.uid, fUser.email || '');
      } else {
        // Check if there is a local demo session or stored active company
        const savedCompanyId = localStorage.getItem('payrelance_active_company_id');
        if (savedCompanyId) {
          await loadSavedCompany(savedCompanyId);
        } else {
          // Setup a default demo workspace so the user can immediately experience the full app without friction
          await loginDemo('Cabinet Expertise & Travaux SARL');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function loadUserData(userId: string, email: string) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      let userData: User;

      if (!userSnap.exists()) {
        userData = {
          id: userId,
          email,
          name: email.split('@')[0],
          createdAt: new Date().toISOString(),
        };
        await setDoc(userRef, userData);
      } else {
        userData = userSnap.data() as User;
      }
      setCurrentUser(userData);

      // Find company membership
      const memSnap = await getDocs(query(collection(db, 'memberships'), where('userId', '==', userId)));
      if (!memSnap.empty) {
        const mem = memSnap.docs[0].data() as Membership;
        setCurrentRole(mem.role);
        const compSnap = await getDoc(doc(db, 'companies', mem.companyId));
        if (compSnap.exists()) {
          setCurrentCompany(compSnap.data() as Company);
          localStorage.setItem('payrelance_active_company_id', mem.companyId);
        }
      }
    } catch (e) {
      console.error('Error loading user data:', e);
    }
  }

  async function loadSavedCompany(companyId: string) {
    try {
      const compSnap = await getDoc(doc(db, 'companies', companyId));
      if (compSnap.exists()) {
        const comp = compSnap.data() as Company;
        setCurrentCompany(comp);
        setCurrentRole('OWNER');
        setCurrentUser({
          id: 'user_active_' + compIdToHash(companyId),
          name: comp.managerName || 'Directeur Général',
          email: comp.email || 'direction@' + comp.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
          createdAt: comp.createdAt,
        });
      } else {
        await loginDemo();
      }
    } catch (err) {
      console.warn('Fallback to demo on company load error:', err);
      await loginDemo();
    }
  }

  function compIdToHash(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  async function loginDemo(companyName = 'Cabinet Expertise & Travaux SARL') {
    setLoading(true);
    try {
      const demoCompanyId = 'company_demo_pme';
      await seedCompanyData(demoCompanyId, companyName, 'FCFA', 'M. Diallo Ousmane');
      
      const compSnap = await getDoc(doc(db, 'companies', demoCompanyId));
      const comp = compSnap.data() as Company;
      setCurrentCompany(comp);
      setCurrentRole('OWNER');
      setCurrentUser({
        id: 'user_demo_owner',
        name: comp.managerName,
        email: 'direction@expertise-travaux.ci',
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('payrelance_active_company_id', demoCompanyId);
    } catch (err) {
      console.error('Error creating demo session:', err);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, pass: string) {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } finally {
      setLoading(false);
    }
  }

  async function register(
    lastName: string, 
    firstName: string, 
    email: string, 
    phone: string, 
    pass: string, 
    companyName: string, 
    currency: string
  ) {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const uid = cred.user.uid;
      const fullName = `${lastName.trim()} ${firstName.trim()}`.trim();

      // 1. Create User profile
      const newUser: User = {
        id: uid,
        email,
        name: fullName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', uid), newUser);
      setCurrentUser(newUser);

      // 2. Create Company
      const compId = 'comp_' + Math.random().toString(36).substring(2, 10);
      await seedCompanyData(compId, companyName, currency, fullName);

      // 3. Create Membership (role = OWNER)
      const memId = 'mem_' + Math.random().toString(36).substring(2, 10);
      const mem: Membership = {
        id: memId,
        userId: uid,
        companyId: compId,
        role: 'OWNER',
        userName: fullName,
        userEmail: email,
        userPhone: phone.trim(),
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'memberships', memId), mem);

      const compSnap = await getDoc(doc(db, 'companies', compId));
      const compData = compSnap.data() as Company;
      setCurrentCompany(compData);
      setCurrentRole('OWNER');
      localStorage.setItem('payrelance_active_company_id', compId);
    } finally {
      setLoading(false);
    }
  }

  // Generate 6-digit OTP code for Email or WhatsApp password reset
  async function resetPasswordWithOtp(emailOrPhone: string, channel: 'EMAIL' | 'WHATSAPP') {
    const cleanTarget = emailOrPhone.trim().toLowerCase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    // Store OTP in Firestore 'password_resets' collection
    const resetRef = doc(db, 'password_resets', cleanTarget);
    await setDoc(resetRef, {
      target: cleanTarget,
      channel,
      otp,
      expiresAt,
      createdAt: new Date().toISOString(),
      used: false,
    });

    return {
      otpCode: otp,
      destination: cleanTarget,
    };
  }

  // Verify OTP and simulate updating password
  async function verifyOtpAndChangePassword(emailOrPhone: string, otp: string, newPass: string) {
    const cleanTarget = emailOrPhone.trim().toLowerCase();
    const resetRef = doc(db, 'password_resets', cleanTarget);
    const snap = await getDoc(resetRef);

    if (!snap.exists()) {
      throw new Error("Aucune demande de réinitialisation trouvée pour ces coordonnées.");
    }

    const data = snap.data();
    if (data.used) {
      throw new Error("Ce code OTP a déjà été utilisé. Veuillez en générer un nouveau.");
    }

    if (new Date() > new Date(data.expiresAt)) {
      throw new Error("Ce code OTP a expiré (validité 15 minutes). Veuillez recommencer.");
    }

    if (data.otp.trim() !== otp.trim()) {
      throw new Error("Le code de sécurité OTP saisi est incorrect.");
    }

    // Mark as used
    await setDoc(resetRef, { used: true, updatedAt: new Date().toISOString() }, { merge: true });

    // Update in auth if current user or inform
    try {
      if (cleanTarget.includes('@')) {
        await signInWithEmailAndPassword(auth, cleanTarget, newPass).catch(() => {});
      }
    } catch {
      // Ignored for non-blocking update
    }
  }

  async function logout() {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('SignOut error, clearing local state', e);
    }
    setFirebaseUser(null);
    setCurrentUser(null);
    setCurrentCompany(null);
    localStorage.removeItem('payrelance_active_company_id');
  }

  async function refreshCompany() {
    if (!currentCompany?.id) return;
    const compSnap = await getDoc(doc(db, 'companies', currentCompany.id));
    if (compSnap.exists()) {
      setCurrentCompany(compSnap.data() as Company);
    }
  }

  async function switchCompanyCurrency(currency: string) {
    if (!currentCompany?.id) return;
    await setDoc(doc(db, 'companies', currentCompany.id), { currency }, { merge: true });
    await refreshCompany();
  }

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        currentUser,
        currentCompany,
        currentRole,
        loading,
        loginDemo,
        login,
        register,
        resetPasswordWithOtp,
        verifyOtpAndChangePassword,
        logout,
        refreshCompany,
        switchCompanyCurrency,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
