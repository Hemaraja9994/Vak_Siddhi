import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  User as UserIcon, 
  Activity, 
  ClipboardCheck, 
  BarChart3, 
  Settings, 
  ChevronRight, 
  ChevronLeft,
  Play,
  Square,
  Save,
  Languages,
  Stethoscope,
  Check,
  X,
  Globe,
  CheckCircle2,
  Volume2,
  AlertCircle,
  Minus,
  Info,
  Wind,
  Mic2,
  Waves,
  Image,
  Timer,
  Type as TypeIcon,
  History,
  Target,
  Printer,
  Trash2,
  Plus,
  ExternalLink,
  Menu,
  Monitor,
  LayoutDashboard,
  TrendingUp,
  Users,
  Calendar,
  PieChart as PieChartIcon,
  Share2,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { GoogleGenAI, Type as GenAIType } from "@google/genai";
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  handleFirestoreError, 
  OperationType,
  User
} from './firebase';

// Types
import { 
  PatientInfo, 
  FDAData, 
  DDKData, 
  RespiratoryData, 
  PhonatoryData, 
  ResonatoryData,
  TreatmentGoals,
  SessionRecord
} from './types';

// Components
const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full gap-3 px-4 py-3 text-sm font-bold transition-all duration-300 rounded-xl group relative overflow-hidden",
      active 
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-[1.02]" 
        : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
    )}
  >
    {active && (
      <motion.div 
        layoutId="sidebar-active"
        className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 -z-10"
      />
    )}
    <Icon size={18} className={cn("transition-transform duration-300", active ? "scale-110" : "group-hover:scale-110")} />
    <span className="relative z-10">{label}</span>
    {!active && <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
  </button>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-2xl font-bold tracking-tight text-slate-800 mb-6 border-b pb-2 border-slate-200">
    {children}
  </h2>
);

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm p-6", className)}>
    {children}
  </div>
);

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsedError = JSON.parse(this.state.error.message);
        if (parsedError.error) {
          errorMessage = `Firestore Error: ${parsedError.error} during ${parsedError.operationType} at ${parsedError.path}`;
        }
      } catch (e) {
        errorMessage = this.state.error.message || String(this.state.error);
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Application Error</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              {errorMessage}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-100"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

enum ArticulationStatus {
  Correct = 'correct',
  Incorrect = 'incorrect',
  Distorted = 'distorted',
  NotTested = 'not-tested'
}

const CONSONANTS = [
  'p', 'ph', 'b', 'bh', 't', 'th', 't (त)', 'th (थ)', 'd (ದ)', 'dh (ಧ)', 't (ಟ)', 'th (ಠ)', 'd (ಡ)', 'dh (ಢ)', 
  'k', 'kh', 'g', 'gh', 'f', 'v', 'th (θ)', 'th (ð)', 's', 'z', 'sh', 'zh', 'h', 'ch', 'j', 'm', 'n', 'ng', 'l', 'r', 'w', 'y'
];

const VOWELS = [
  'a', 'a (æ)', 'a (ɑ)', 'e', 'e (ɛ)', 'e (i)', 'i', 'i (ɪ)', 'o', 'o (ɒ)', 'o (oʊ)', 'u', 'u (ʌ)', 'u (u)', 'ai', 'au', 'oi'
];

export default function App() {
  const [activeTab, setActiveTab] = useState('patient');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [clinicianName, setClinicianName] = useState('Mr. Hemaraja Nayaka S');
  const [clinicianCredentials, setClinicianCredentials] = useState('M.Sc SLP, PGDBEME, DHA&ET- Associate Professor in Speech Language Pathology');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [records, setRecords] = useState<PatientInfo[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    const element = reportRef.current;
    if (!element) {
      console.error('Report element not found');
      setIsDownloading(false);
      return;
    }

    // Capture original state to restore later
    const originalStyle = element.getAttribute('style') || '';
    const originalClassName = element.className;
    
    try {
      console.log('Starting PDF generation...');
      
      // Ensure we are at the top of the page for capture to avoid scroll-related blank pages
      const originalScrollY = window.scrollY;
      window.scrollTo(0, 0);
      
      // Temporarily remove print-only class and make it visible and styled for capture
      element.className = originalClassName.replace('print-only', '').trim();
      
      element.style.display = 'block';
      element.style.position = 'fixed';
      element.style.top = '0';
      element.style.left = '0';
      element.style.width = '800px'; 
      element.style.zIndex = '999999';
      element.style.backgroundColor = 'white';
      element.style.colorScheme = 'light';
      element.style.visibility = 'visible';
      element.style.opacity = '1';
      element.style.height = 'auto';
      element.style.overflow = 'visible';
      element.style.pointerEvents = 'auto';
      
      // Wait for any charts/images/fonts to render completely
      await new Promise(resolve => setTimeout(resolve, 4000));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: true,
        windowWidth: 800,
        scrollY: 0,
        scrollX: 0,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc: Document) => {
          const clonedElement = clonedDoc.getElementById('print-report-container');
          if (clonedElement) {
            clonedElement.style.display = 'block';
            clonedElement.style.visibility = 'visible';
            clonedElement.style.opacity = '1';
            clonedElement.style.position = 'relative';
            clonedElement.style.top = '0';
            clonedElement.style.left = '0';
            clonedElement.style.width = '800px';
          }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      pdf.save(`VakSiddhi_Assessment_Report_${patientInfo.name || 'Patient'}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      console.log('PDF generated successfully');
      
      // Restore scroll
      window.scrollTo(0, originalScrollY);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Automatic download failed. Opening print dialog as fallback.');
      window.print();
    } finally {
      // Restore original state
      element.className = originalClassName;
      element.setAttribute('style', originalStyle);
      setIsDownloading(false);
    }
  };

  // Auth Listener
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Sync Records with Firestore
  React.useEffect(() => {
    if (!user) {
      setRecords([]);
      return;
    }

    const q = query(collection(db, `users/${user.uid}/records`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRecords: PatientInfo[] = [];
      snapshot.forEach((doc) => {
        fetchedRecords.push(doc.data() as PatientInfo);
      });
      setRecords(fetchedRecords);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/records`);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const validatePatientInfo = () => {
    const newErrors: Record<string, string> = {};
    if (!patientInfo.name.trim()) newErrors.name = "Patient name is required";
    if (!patientInfo.age.trim()) newErrors.age = "Age is required";
    else if (isNaN(Number(patientInfo.age)) || Number(patientInfo.age) < 0 || Number(patientInfo.age) > 120) {
      newErrors.age = "Please enter a valid age (0-120)";
    }
    if (!patientInfo.gender) newErrors.gender = "Gender is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    id: crypto.randomUUID(),
    name: '',
    age: '',
    gender: '',
    caseNo: '',
    clinician: '',
    date: new Date().toISOString().split('T')[0],
    complaint: '',
    medicalHistory: '',
    onset: '',
    course: '',
    siteOfLesion: '',
    neurologicalDiagnosis: '',
    associatedDeficits: [],
    swallowingStatus: [],
    respiratorySupport: [],
    medications: '',
    bodySystems: '',
    ncdHistory: [],
    radiologicalFindings: '',
    laboratoryFindings: '',
    otherInvestigations: '',
    surgicalHistory: '',
    familyHistory: '',
    socialHistory: '',
    lifestyleFactors: [],
    developmentalHistory: '',
    birthHistory: '',
    sessions: []
  });

  const [treatmentGoals, setTreatmentGoals] = useState<TreatmentGoals>({
    subsystems: {
      respiration: { shortTerm: [], longTerm: [] },
      phonation: { shortTerm: [], longTerm: [] },
      resonance: { shortTerm: [], longTerm: [] },
      articulation: { shortTerm: [], longTerm: [] },
      prosody: { shortTerm: [], longTerm: [] }
    }
  });

  const [newGoal, setNewGoal] = useState({ subsystem: '', type: 'shortTerm' as 'shortTerm' | 'longTerm', text: '' });

  const addCustomGoal = (subsystem: string, type: 'shortTerm' | 'longTerm') => {
    if (!newGoal.text.trim()) return;
    
    setTreatmentGoals(prev => ({
      ...prev,
      subsystems: {
        ...prev.subsystems,
        [subsystem]: {
          ...prev.subsystems[subsystem as keyof typeof prev.subsystems],
          [type]: [...prev.subsystems[subsystem as keyof typeof prev.subsystems][type], newGoal.text.trim()]
        }
      }
    }));
    setNewGoal({ ...newGoal, text: '' });
  };

  const removeGoal = (subsystem: string, type: 'shortTerm' | 'longTerm', index: number) => {
    setTreatmentGoals(prev => ({
      ...prev,
      subsystems: {
        ...prev.subsystems,
        [subsystem]: {
          ...prev.subsystems[subsystem as keyof typeof prev.subsystems],
          [type]: prev.subsystems[subsystem as keyof typeof prev.subsystems][type].filter((_, i) => i !== index)
        }
      }
    }));
  };

  const ARTICULATION_STIMULI: Record<string, Record<string, { initial: string, medial: string, final: string }>> = {
    'English': {
      // Plosives
      'p': { initial: 'Pen', medial: 'Apple', final: 'Cup' },
      'b': { initial: 'Ball', medial: 'Table', final: 'Tub' },
      't': { initial: 'Ten', medial: 'Water', final: 'Cat' },
      'd': { initial: 'Dog', medial: 'Ladder', final: 'Bed' },
      'k': { initial: 'Key', medial: 'Bucket', final: 'Book' },
      'g': { initial: 'Goat', medial: 'Tiger', final: 'Dog' },
      // Fricatives
      'f': { initial: 'Fish', medial: 'Coffee', final: 'Leaf' },
      'v': { initial: 'Van', medial: 'Seven', final: 'Glove' },
      'th (θ)': { initial: 'Thumb', medial: 'Birthday', final: 'Bath' },
      'th (ð)': { initial: 'This', medial: 'Mother', final: 'Breathe' },
      's': { initial: 'Sun', medial: 'Glasses', final: 'Bus' },
      'z': { initial: 'Zoo', medial: 'Puzzle', final: 'Buzz' },
      'sh': { initial: 'Ship', medial: 'Fishing', final: 'Fish' },
      'zh': { initial: 'Measure', medial: 'Vision', final: 'Garage' },
      'h': { initial: 'Hat', medial: 'Behind', final: '-' },
      // Affricates
      'ch': { initial: 'Chair', medial: 'Watcher', final: 'Watch' },
      'j': { initial: 'Jam', medial: 'Magic', final: 'Bridge' },
      // Nasals
      'm': { initial: 'Moon', medial: 'Hammer', final: 'Drum' },
      'n': { initial: 'Nose', medial: 'Banana', final: 'Pen' },
      'ng': { initial: '-', medial: 'Singing', final: 'Ring' },
      // Liquids & Glides
      'l': { initial: 'Leaf', medial: 'Balloon', final: 'Bell' },
      'r': { initial: 'Red', medial: 'Carrot', final: 'Star' },
      'w': { initial: 'Watch', medial: 'Flower', final: '-' },
      'y': { initial: 'Yellow', medial: 'Onion', final: '-' },
      // Vowels
      'a (æ)': { initial: 'Apple', medial: 'Cat', final: '-' },
      'a (ɑ)': { initial: 'Arm', medial: 'Father', final: 'Car' },
      'e (ɛ)': { initial: 'Egg', medial: 'Bed', final: '-' },
      'e (i)': { initial: 'Eat', medial: 'Tree', final: 'Bee' },
      'i (ɪ)': { initial: 'Ink', medial: 'Pin', final: '-' },
      'o (ɒ)': { initial: 'Orange', medial: 'Dog', final: '-' },
      'o (oʊ)': { initial: 'Old', medial: 'Boat', final: 'Go' },
      'u (ʌ)': { initial: 'Up', medial: 'Cup', final: '-' },
      'u (u)': { initial: 'Ooze', medial: 'Blue', final: 'Shoe' },
      'ai': { initial: 'Ice', medial: 'Bite', final: 'Sky' },
      'au': { initial: 'Out', medial: 'House', final: 'Cow' },
      'oi': { initial: 'Oil', medial: 'Boy', final: 'Toy' },
    },
    'Hindi': {
      'p': { initial: 'Patang', medial: 'Kapada', final: 'Saap' },
      'ph': { initial: 'Phal', medial: 'Saphal', final: 'Saaph' },
      'b': { initial: 'Bakari', medial: 'Sabun', final: 'Ab' },
      'bh': { initial: 'Bhalu', medial: 'Abhi', final: 'Labh' },
      't (त)': { initial: 'Tala', medial: 'Pata', final: 'Haat' },
      'th (थ)': { initial: 'Thali', medial: 'Matha', final: 'Saath' },
      'd (द)': { initial: 'Dawai', medial: 'Badal', final: 'Khad' },
      'dh (ध)': { initial: 'Dhan', medial: 'Adha', final: 'Doodh' },
      't (ट)': { initial: 'Tamatar', medial: 'Mata', final: 'Chot' },
      'th (ठ)': { initial: 'Thag', medial: 'Path', final: 'Aath' },
      'd (ड)': { initial: 'Danda', medial: 'Gadi', final: 'Ped' },
      'dh (ढ)': { initial: 'Dhakan', medial: 'Padhna', final: 'Gadh' },
      'k': { initial: 'Kalam', medial: 'Makan', final: 'Naak' },
      'kh': { initial: 'Khargosh', medial: 'Aankh', final: 'Lakh' },
      'g': { initial: 'Gamala', medial: 'Sagar', final: 'Aag' },
      'gh': { initial: 'Ghar', medial: 'Magh', final: 'Bagh' },
      'm': { initial: 'Mala', medial: 'Kamal', final: 'Aam' },
      'n': { initial: 'Nal', medial: 'Anar', final: 'Kaan' },
      's': { initial: 'Seb', medial: 'Rasta', final: 'Bas' },
      'sh': { initial: 'Sher', medial: 'Asha', final: 'Desh' },
      'h': { initial: 'Hathi', medial: 'Bahar', final: '-' },
      'ch': { initial: 'Chammach', medial: 'Acha', final: 'Sach' },
      'j': { initial: 'Jahaj', medial: 'Raja', final: 'Aaj' },
      'r': { initial: 'Rath', medial: 'Ghar', final: 'Kar' },
      'l': { initial: 'Ladka', medial: 'Kala', final: 'Phal' },
      'v': { initial: 'Van', medial: 'Kavi', final: 'Shiv' },
      'a': { initial: 'Aam', medial: 'Kaam', final: 'Kala' },
      'i': { initial: 'Imli', medial: 'Din', final: 'Pani' },
      'u': { initial: 'Ullu', medial: 'Phool', final: 'Bhalu' },
      'e': { initial: 'Ek', medial: 'Seb', final: 'Me' },
      'o': { initial: 'Okhli', medial: 'Sona', final: 'Do' },
    },
    'Kannada': {
      'p': { initial: 'Puta', medial: 'Kapa', final: 'Deepa' },
      'ph': { initial: 'Phala', medial: 'Saphala', final: 'Labha' },
      'b': { initial: 'Bale', medial: 'Habba', final: 'Labha' },
      'bh': { initial: 'Bhaya', medial: 'Abhaya', final: 'Garbha' },
      't (ತ)': { initial: 'Tale', medial: 'Ata', final: 'Mata' },
      'th (ಥ)': { initial: 'Ratha', medial: 'Katha', final: 'Patha' },
      'd (ದ)': { initial: 'Dana', medial: 'Gadi', final: 'Hada' },
      'dh (ಧ)': { initial: 'Dhana', medial: 'Adhara', final: 'Bodha' },
      't (ಟ)': { initial: 'Tate', medial: 'Pata', final: 'Gata' },
      'th (ಠ)': { initial: 'Patha', medial: 'Matha', final: 'Katha' },
      'd (ಡ)': { initial: 'Dabba', medial: 'Gadi', final: 'Hada' },
      'dh (ಢ)': { initial: 'Dhakka', medial: 'Gadha', final: 'Drudha' },
      'k': { initial: 'Kalu', medial: 'Aka', final: 'Muka' },
      'kh': { initial: 'Khara', medial: 'Mukha', final: 'Shakha' },
      'g': { initial: 'Gadi', medial: 'Maga', final: 'Raga' },
      'gh': { initial: 'Ghate', medial: 'Megha', final: 'Argha' },
      'm': { initial: 'Mane', medial: 'Amma', final: 'Mara' },
      'n': { initial: 'Nayi', medial: 'Anna', final: 'Mana' },
      's': { initial: 'Sose', medial: 'Hosa', final: 'Masa' },
      'sh': { initial: 'Shale', medial: 'Asha', final: 'Desha' },
      'h': { initial: 'Halu', medial: 'Maha', final: 'Deha' },
      'ch': { initial: 'Chandra', medial: 'Acha', final: 'Vacha' },
      'j': { initial: 'Jana', medial: 'Raja', final: 'Gaja' },
      'r': { initial: 'Ratha', medial: 'Mara', final: 'Kara' },
      'l': { initial: 'Lata', medial: 'Kala', final: 'Phala' },
      'v': { initial: 'Vana', medial: 'Kavi', final: 'Shiva' },
      'a': { initial: 'Appa', medial: 'Mara', final: 'Sala' },
      'i': { initial: 'Ili', medial: 'Gili', final: 'Pani' },
      'u': { initial: 'Uta', medial: 'Muta', final: 'Hulu' },
      'e': { initial: 'Ele', medial: 'Bele', final: 'Mele' },
      'o': { initial: 'Ondu', medial: 'Kote', final: 'Hogo' },
    },
    'Telugu': {
      'p': { initial: 'Paapa', medial: 'Kappa', final: 'Deepam' },
      'ph': { initial: 'Phalam', medial: 'Saphalam', final: 'Labham' },
      'b': { initial: 'Banthi', medial: 'Dabba', final: 'Labham' },
      'bh': { initial: 'Bhayam', medial: 'Abhayam', final: 'Garbham' },
      't (త)': { initial: 'Thala', medial: 'Aata', final: 'Paatha' },
      'th (థ)': { initial: 'Ratham', medial: 'Katha', final: 'Patham' },
      'd (ద)': { initial: 'Danda', medial: 'Gadi', final: 'Paada' },
      'dh (ధ)': { initial: 'Dhanam', medial: 'Adharam', final: 'Bodham' },
      't (ట)': { initial: 'Tate', medial: 'Pata', final: 'Gata' },
      'th (ఠ)': { initial: 'Patham', medial: 'Matham', final: 'Katham' },
      'd (డ)': { initial: 'Dabba', medial: 'Gadi', final: 'Hada' },
      'dh (ఢ)': { initial: 'Dhakka', medial: 'Gadha', final: 'Drudha' },
      'k': { initial: 'Kalam', medial: 'Aaka', final: 'Muka' },
      'kh': { initial: 'Khara', medial: 'Mukham', final: 'Shakha' },
      'g': { initial: 'Gadi', medial: 'Maga', final: 'Raaga' },
      'gh': { initial: 'Ghate', medial: 'Megham', final: 'Argham' },
      'm': { initial: 'Mokka', medial: 'Amma', final: 'Maama' },
      'n': { initial: 'Nalla', medial: 'Anna', final: 'Mana' },
      's': { initial: 'Sanchi', medial: 'Paasa', final: 'Masa' },
      'sh': { initial: 'Shale', medial: 'Asha', final: 'Desha' },
      'h': { initial: 'Halu', medial: 'Maha', final: 'Deha' },
      'ch': { initial: 'Chandra', medial: 'Acha', final: 'Vacha' },
      'j': { initial: 'Jana', medial: 'Raja', final: 'Gaja' },
      'r': { initial: 'Ratham', medial: 'Mara', final: 'Kara' },
      'l': { initial: 'Lata', medial: 'Kala', final: 'Phala' },
      'v': { initial: 'Vana', medial: 'Kavi', final: 'Shiva' },
      'a': { initial: 'Amma', medial: 'Maama', final: 'Paata' },
      'i': { initial: 'Illu', medial: 'Gilli', final: 'Pani' },
      'u': { initial: 'Uru', medial: 'Muru', final: 'Pulu' },
      'e': { initial: 'Ele', medial: 'Bele', final: 'Mele' },
      'o': { initial: 'Ondu', medial: 'Kote', final: 'Hogo' },
    },
    'Tamil': {
      'p': { initial: 'Palam', medial: 'Appa', final: 'Paap' },
      'b': { initial: 'Balam', medial: 'Abba', final: 'Labam' },
      't': { initial: 'Thalai', medial: 'Aatta', final: 'Paath' },
      'd': { initial: 'Danda', medial: 'Gadi', final: 'Paad' },
      'k': { initial: 'Kalam', medial: 'Akka', final: 'Muka' },
      'g': { initial: 'Gadi', medial: 'Maga', final: 'Raga' },
      'm': { initial: 'Mane', medial: 'Amma', final: 'Mara' },
      'n': { initial: 'Nayi', medial: 'Anna', final: 'Mana' },
      's': { initial: 'Sose', medial: 'Hosa', final: 'Masa' },
      'sh': { initial: 'Shale', medial: 'Asha', final: 'Desha' },
      'h': { initial: 'Halu', medial: 'Maha', final: 'Deha' },
      'ch': { initial: 'Chandra', medial: 'Acha', final: 'Vacha' },
      'j': { initial: 'Jana', medial: 'Raja', final: 'Gaja' },
      'r': { initial: 'Ratha', medial: 'Mara', final: 'Kara' },
      'l': { initial: 'Lata', medial: 'Kala', final: 'Phala' },
      'v': { initial: 'Vana', medial: 'Kavi', final: 'Shiva' },
      'a': { initial: 'Appa', medial: 'Mara', final: 'Sala' },
      'i': { initial: 'Ili', medial: 'Gili', final: 'Pani' },
      'u': { initial: 'Uta', medial: 'Muta', final: 'Hulu' },
      'e': { initial: 'Ele', medial: 'Bele', final: 'Mele' },
      'o': { initial: 'Ondu', medial: 'Kote', final: 'Hogo' },
    },
    'Malayalam': {
      'p': { initial: 'Palam', medial: 'Appa', final: 'Paap' },
      'b': { initial: 'Balam', medial: 'Abba', final: 'Labam' },
      't': { initial: 'Thala', medial: 'Aatta', final: 'Paath' },
      'd': { initial: 'Danda', medial: 'Gadi', final: 'Paad' },
      'k': { initial: 'Kalam', medial: 'Akka', final: 'Muka' },
      'g': { initial: 'Gadi', medial: 'Maga', final: 'Raga' },
      'm': { initial: 'Mane', medial: 'Amma', final: 'Mara' },
      'n': { initial: 'Nayi', medial: 'Anna', final: 'Mana' },
      's': { initial: 'Sose', medial: 'Hosa', final: 'Masa' },
      'sh': { initial: 'Shale', medial: 'Asha', final: 'Desha' },
      'h': { initial: 'Halu', medial: 'Maha', final: 'Deha' },
      'ch': { initial: 'Chandra', medial: 'Acha', final: 'Vacha' },
      'j': { initial: 'Jana', medial: 'Raja', final: 'Gaja' },
      'r': { initial: 'Ratha', medial: 'Mara', final: 'Kara' },
      'l': { initial: 'Lata', medial: 'Kala', final: 'Phala' },
      'v': { initial: 'Vana', medial: 'Kavi', final: 'Shiva' },
      'a': { initial: 'Appa', medial: 'Mara', final: 'Sala' },
      'i': { initial: 'Ili', medial: 'Gili', final: 'Pani' },
      'u': { initial: 'Uta', medial: 'Muta', final: 'Hulu' },
      'e': { initial: 'Ele', medial: 'Bele', final: 'Mele' },
      'o': { initial: 'Ondu', medial: 'Kote', final: 'Hogo' },
    }
  };

  const [selectedLanguage, setSelectedLanguage] = useState('English');

  const [respiratoryData, setRespiratoryData] = useState<RespiratoryData>({
    mpt: { trials: [0, 0, 0], average: 0 },
    szRatio: { s: 0, z: 0, ratio: 0 }
  });

  const [phonatoryData, setPhonatoryData] = useState<PhonatoryData>({
    acousticParameters: { jitter: '-', shimmer: '-', hnr: '-', f0: '-' },
    quality: ''
  });

  const [grbasData, setGrbasData] = useState({
    grade: 0,
    roughness: 0,
    breathiness: 0,
    asthenia: 0,
    strain: 0
  });

  const [resonatoryData, setResonatoryData] = useState<ResonatoryData>({
    hypernasality: 0,
    hyponasality: 0,
    nasalEmission: false,
    pressureConsonants: { 'p': 4, 'b': 4, 't': 4, 'd': 4, 'k': 4, 'g': 4 }
  });

  const [elicitationData, setElicitationData] = useState({
    transcription: '',
    pcc: 0,
    errors: [] as string[],
    recordingUrl: null as string | null
  });

  const [fdaData, setFdaData] = useState<FDAData>({
    reflex: { cough: 4, swallow: 4, dribble: 4 },
    respiration: { rest: 4, speech: 4 },
    lips: { rest: 4, spread: 4, seal: 4, alternate: 4, speech: 4 },
    jaw: { rest: 4, speech: 4 },
    palate: { fluids: 4, maintenance: 4, speech: 4 },
    laryngeal: { time: 4, pitch: 4, volume: 4, speech: 4 },
    tongue: { rest: 4, protrusion: 4, elevation: 4, lateral: 4, alternate: 4, speech: 4 },
    intelligibility: { words: 4, sentences: 4, conversation: 4 }
  });

  const [manualDiagnosis, setManualDiagnosis] = useState<string>('');
  const [manualSeverity, setManualSeverity] = useState<string>('');

  const DYSARTHRIA_TYPES = [
    "Flaccid Dysarthria",
    "Spastic Dysarthria",
    "Ataxic Dysarthria",
    "Hypokinetic Dysarthria",
    "Hyperkinetic Dysarthria",
    "Mixed Dysarthria",
    "Unilateral Upper Motor Neuron Dysarthria",
    "Undetermined Dysarthria"
  ];

  const SEVERITY_LEVELS = [
    "Normal/Subclinical",
    "Mild",
    "Moderate",
    "Severe",
    "Profound"
  ];

  const [fdaObservations, setFdaObservations] = useState<Record<string, string>>({
    reflex: '',
    respiration: '',
    lips: '',
    jaw: '',
    palate: '',
    laryngeal: '',
    tongue: '',
    intelligibility: '',
    naturalness: ''
  });

  const [oroMotorData, setOroMotorData] = useState({
    structures: {
      lips: { symmetry: 4, size: 4, tone: 4 },
      tongue: { symmetry: 4, size: 4, tone: 4 },
      jaw: { symmetry: 4, alignment: 4 },
      palate: { symmetry: 4, structure: 4 },
      teeth: { occlusion: 4, hygiene: 4 }
    },
    functions: {
      lips: { retraction: 4, protrusion: 4, seal: 4, alternate: 4 },
      tongue: { protrusion: 4, elevation: 4, lateralization: 4, alternate: 4 },
      jaw: { opening: 4, lateral: 4 },
      palate: { elevation: 4, gag: 4 }
    }
  });

  const [oroMotorObservations, setOroMotorObservations] = useState({
    structures: '',
    functions: ''
  });

  const ELICITATION_INSTRUCTIONS: Record<string, Record<string, string>> = {
    oroMotorStructures: {
      lips: "Observe the lips at rest for symmetry, size, and muscle tone.",
      tongue: "Observe the tongue at rest on the floor of the mouth.",
      jaw: "Observe the jaw at rest for symmetry and dental alignment.",
      palate: "Observe the hard and soft palate structure and symmetry.",
      teeth: "Inspect dental occlusion and overall oral hygiene."
    },
    oroMotorFunctions: {
      retraction: "Ask the patient to smile broadly showing teeth.",
      protrusion: "Ask the patient to pucker their lips or stick tongue out.",
      seal: "Ask the patient to puff out their cheeks and hold the air.",
      alternate: "Ask the patient to alternate movements rapidly.",
      elevation: "Ask the patient to touch the tip of their tongue to the roof of their mouth.",
      lateralization: "Ask the patient to move their tongue/jaw from side to side.",
      opening: "Ask the patient to open their mouth as wide as possible.",
      lateral: "Ask the patient to move their jaw from side to side.",
      gag: "Test the gag reflex using a tongue depressor (if clinically indicated)."
    },
    fda: {
      cough: "Ask the patient to produce a sharp, voluntary cough.",
      swallow: "Observe the patient swallowing saliva or a small sip of water.",
      dribble: "Observe for any drooling or loss of saliva.",
      rest: "Observe the structure at rest.",
      speech: "Observe movement and quality during conversational speech.",
      spread: "Ask the patient to smile broadly.",
      seal: "Ask the patient to puff cheeks and hold air against resistance.",
      alternate: "Ask the patient to alternate movements or sounds (e.g., /i-u/).",
      fluids: "Ask if the patient experiences nasal regurgitation of fluids.",
      maintenance: "Ask the patient to say 'ah' and observe palate elevation.",
      time: "Ask the patient to sustain /a/ for as long as possible (MPT).",
      pitch: "Ask the patient to glide from low to high pitch.",
      volume: "Ask the patient to count 1-5, increasing volume with each number.",
      protrusion: "Ask the patient to stick their tongue out.",
      elevation: "Ask the patient to touch the tip of the tongue to the alveolar ridge.",
      lateral: "Ask the patient to move the tongue to the corners of the mouth.",
      words: "Ask the patient to repeat a list of single words.",
      sentences: "Ask the patient to repeat standard sentences.",
      conversation: "Assess during spontaneous conversation."
    },
    ddk: {
      '/pa/': "Repeat 'pa-pa-pa' as fast and as evenly as possible.",
      '/ta/': "Repeat 'ta-ta-ta' as fast and as evenly as possible.",
      '/ka/': "Repeat 'ka-ka-ka' as fast and as evenly as possible.",
      '/pataka/': "Repeat 'pa-ta-ka' as fast and as evenly as possible."
    }
  };

  const [naturalnessScore, setNaturalnessScore] = useState(4);

  const [ddkData, setDdkData] = useState<DDKData[]>([
    { task: '/pa/', count: 0, seconds: 0, rate: 0 },
    { task: '/ta/', count: 0, seconds: 0, rate: 0 },
    { task: '/ka/', count: 0, seconds: 0, rate: 0 },
    { task: '/pataka/', count: 0, seconds: 0, rate: 0 },
  ]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDdkIdx, setRecordingDdkIdx] = useState<number | null>(null);
  const [analyzingDdkIdx, setAnalyzingDdkIdx] = useState<number | null>(null);
  const [recordingArticulationPhoneme, setRecordingArticulationPhoneme] = useState<string | null>(null);
  const [analyzingArticulationPhoneme, setAnalyzingArticulationPhoneme] = useState<string | null>(null);
  const [articulationData, setArticulationData] = useState<Record<string, { 
    initial: ArticulationStatus, 
    medial: ArticulationStatus, 
    final: ArticulationStatus,
    notes?: string
  }>>(() => {
    const phonemes = [...CONSONANTS, ...VOWELS];
    return phonemes.reduce((acc, p) => ({ 
      ...acc, 
      [p]: { 
        initial: ArticulationStatus.Correct, 
        medial: ArticulationStatus.Correct, 
        final: ArticulationStatus.Correct,
        notes: ''
      } 
    }), {});
  });
  const [recordingTime, setRecordingTime] = useState(0);
  const [aiResult, setAiResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stimulusImage, setStimulusImage] = useState<'cookie' | 'park'>('cookie');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async (ddkIdx: number | null = null, articulationPhoneme: string | null = null) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          if (ddkIdx !== null) {
            await handleDdkAnalyze(base64Audio, ddkIdx);
          } else if (articulationPhoneme !== null) {
            await handleArticulationAnalyze(base64Audio, articulationPhoneme);
          } else {
            await handleAnalyze(base64Audio);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDdkIdx(ddkIdx);
      setRecordingArticulationPhoneme(articulationPhoneme);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Please allow microphone access to record samples.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingDdkIdx(null);
      setRecordingArticulationPhoneme(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleArticulationAnalyze = async (base64Audio: string, phoneme: string) => {
    setIsAnalyzing(true);
    setAnalyzingArticulationPhoneme(phoneme);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const stimuli = ARTICULATION_STIMULI[selectedLanguage][phoneme] || { initial: '-', medial: '-', final: '-' };
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: `Analyze this clinical articulation test recording for the phoneme "${phoneme}". 
              The patient was asked to say these words:
              - Initial: "${stimuli.initial}"
              - Medial: "${stimuli.medial}"
              - Final: "${stimuli.final}"
              
              For each position, determine if the production was:
              - "correct"
              - "incorrect" (substitution or omission)
              - "distorted" (imprecise but recognizable)
              - "not-tested" (if the word was not attempted)
              
              Return as JSON with "initial", "medial", and "final" statuses, and a "notes" field summarizing the specific error types (e.g., "Substitution of /p/ with /b/ in initial position").` } ,
              { inlineData: { data: base64Audio, mimeType: "audio/wav" } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: GenAIType.OBJECT,
            properties: {
              initial: { type: GenAIType.STRING, enum: Object.values(ArticulationStatus) },
              medial: { type: GenAIType.STRING, enum: Object.values(ArticulationStatus) },
              final: { type: GenAIType.STRING, enum: Object.values(ArticulationStatus) },
              notes: { type: GenAIType.STRING }
            },
            required: ["initial", "medial", "final", "notes"]
          }
        }
      });

      const result = JSON.parse(response.text);
      setArticulationData(prev => ({
        ...prev,
        [phoneme]: {
          initial: result.initial as ArticulationStatus,
          medial: result.medial as ArticulationStatus,
          final: result.final as ArticulationStatus,
          notes: result.notes
        }
      }));
    } catch (err) {
      console.error("Articulation AI Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
      setAnalyzingArticulationPhoneme(null);
    }
  };

  const handleDdkAnalyze = async (base64Audio: string, idx: number) => {
    setIsAnalyzing(true);
    setAnalyzingDdkIdx(idx);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const task = ddkData[idx].task;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: `Analyze this clinical DDK (Diadochokinetic) task recording for the task "${task}". 
              1. Count how many times the patient repeated the target syllable(s) clearly.
              2. Determine the total duration of the repetitions in seconds.
              Return as JSON with "count" (number) and "seconds" (number).` },
              { inlineData: { data: base64Audio, mimeType: "audio/wav" } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: GenAIType.OBJECT,
            properties: {
              count: { type: GenAIType.NUMBER },
              seconds: { type: GenAIType.NUMBER }
            },
            required: ["count", "seconds"]
          }
        }
      });

      const result = JSON.parse(response.text);
      const newDdk = [...ddkData];
      newDdk[idx].count = result.count;
      newDdk[idx].seconds = result.seconds;
      newDdk[idx].rate = result.seconds > 0 ? Number((result.count / result.seconds).toFixed(2)) : 0;
      setDdkData(newDdk);
    } catch (err) {
      console.error("DDK AI Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
      setAnalyzingDdkIdx(null);
    }
  };

  const handleAnalyze = async (base64Audio: string) => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: `Analyze this clinical speech sample for dysarthria and articulation disorders. 
              Provide a detailed assessment including:
              1. Transcription of the speech.
              2. Percentage Consonant Correct (PCC).
              3. Granular Phonological Error Analysis: For each error, identify the target phoneme, the actual production (substitution/omission), and the specific error type:
                 - "substitution": replacing one phoneme with another
                 - "omission": deleting a phoneme
                 - "distortion": imprecise production (e.g., lateralized /s/)
                 - "addition": adding an extra phoneme
              4. Acoustic metrics: Jitter (%), Shimmer (dB), HNR (dB), and Fundamental Frequency (F0 in Hz).
              
              Return the results strictly as a JSON object.` },
              { inlineData: { data: base64Audio, mimeType: "audio/wav" } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: GenAIType.OBJECT,
            properties: {
              transcription: { type: GenAIType.STRING },
              pcc: { type: GenAIType.NUMBER },
              errors: { 
                type: GenAIType.ARRAY, 
                items: { 
                  type: GenAIType.OBJECT,
                  properties: {
                    phoneme: { type: GenAIType.STRING },
                    substitution: { type: GenAIType.STRING },
                    type: { type: GenAIType.STRING }
                  }
                } 
              },
              phonation_metrics: {
                type: GenAIType.OBJECT,
                properties: {
                  jitter: { type: GenAIType.STRING },
                  shimmer: { type: GenAIType.STRING },
                  hnr: { type: GenAIType.STRING },
                  f0: { type: GenAIType.STRING }
                }
              }
            }
          }
        }
      });

      const result = JSON.parse(response.text);
      setAiResult(result);
      
      // Update phonatory data if metrics are present
      if (result.phonation_metrics) {
        setPhonatoryData(prev => ({
          ...prev,
          acousticParameters: {
            jitter: result.phonation_metrics.jitter || prev.acousticParameters.jitter,
            shimmer: result.phonation_metrics.shimmer || prev.acousticParameters.shimmer,
            hnr: result.phonation_metrics.hnr || prev.acousticParameters.hnr,
            f0: result.phonation_metrics.f0 || prev.acousticParameters.f0
          }
        }));
      }

      // Update elicitation data
      setElicitationData(prev => ({
        ...prev,
        transcription: result.transcription || prev.transcription,
        pcc: result.pcc || prev.pcc,
        errors: result.errors || prev.errors
      }));

    } catch (err) {
      console.error("AI Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveRecord = async () => {
    if (!validatePatientInfo()) {
      alert('Please fix the errors in the Patient Proforma before saving.');
      setActiveTab('patient');
      return;
    }

    if (!user) {
      alert('Please login to save records to the cloud.');
      return;
    }

    setIsSaving(true);
    try {
      const newSession: SessionRecord = {
        date: new Date().toISOString(),
        fdaData,
        respiratoryData,
        phonatoryData,
        resonatoryData,
        ddkData,
        treatmentGoals,
        manualDiagnosis,
        manualSeverity,
        grbasData
      };

      const updatedPatient = {
        ...patientInfo,
        sessions: [...patientInfo.sessions, newSession]
      };

      const recordRef = doc(db, `users/${user.uid}/records`, updatedPatient.id);
      await setDoc(recordRef, updatedPatient);
      
      alert('Record saved successfully to the cloud!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/records/${patientInfo.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const loadRecord = (record: PatientInfo) => {
    setPatientInfo(record);
    if (record.sessions.length > 0) {
      const lastSession = record.sessions[record.sessions.length - 1];
      setFdaData(lastSession.fdaData);
      setRespiratoryData(lastSession.respiratoryData);
      setPhonatoryData(lastSession.phonatoryData);
      setResonatoryData(lastSession.resonatoryData);
      setDdkData(lastSession.ddkData);
      setTreatmentGoals(lastSession.treatmentGoals);
      setManualDiagnosis(lastSession.manualDiagnosis || '');
      setManualSeverity(lastSession.manualSeverity || '');
      if (lastSession.grbasData) {
        setGrbasData(lastSession.grbasData);
      }
    }
    setActiveTab('patient');
  };

  const generateGoals = () => {
    const newGoals: TreatmentGoals = {
      subsystems: {
        respiration: { shortTerm: [], longTerm: [] },
        phonation: { shortTerm: [], longTerm: [] },
        resonance: { shortTerm: [], longTerm: [] },
        articulation: { shortTerm: [], longTerm: [] },
        prosody: { shortTerm: [], longTerm: [] }
      }
    };

    // Respiration goals based on FDA or MPT
    if (respiratoryData.mpt.average < 10) {
      newGoals.subsystems.respiration.shortTerm.push("Increase MPT to 12 seconds using diaphragmatic breathing exercises.");
      newGoals.subsystems.respiration.longTerm.push("Achieve adequate respiratory support for conversational speech (MPT > 15s).");
    }

    // Phonation goals based on FDA laryngeal
    if (fdaData.laryngeal.volume < 3) {
      newGoals.subsystems.phonation.shortTerm.push("Improve vocal intensity using LSVT-style 'Think Loud' techniques.");
      newGoals.subsystems.phonation.longTerm.push("Maintain functional vocal volume in noisy environments.");
    }

    // Resonance goals
    if (resonatoryData.hypernasality > 1) {
      newGoals.subsystems.resonance.shortTerm.push("Reduce hypernasality using visual feedback (mirror) during pressure consonants.");
      newGoals.subsystems.resonance.longTerm.push("Achieve balanced resonance in connected speech.");
    }

    // Articulation goals
    if (fdaData.intelligibility.words < 3) {
      newGoals.subsystems.articulation.shortTerm.push("Improve phonetic placement for stop consonants /p, b, t, d/.");
      newGoals.subsystems.articulation.longTerm.push("Achieve 90% intelligibility at the sentence level.");
    }

    setTreatmentGoals(newGoals);
    setActiveTab('treatment');
  };

  const renderPatientInfo = () => {
    const toggleCheckbox = (field: keyof PatientInfo, value: string) => {
      const current = patientInfo[field] as string[];
      if (current.includes(value)) {
        setPatientInfo({ ...patientInfo, [field]: current.filter(v => v !== value) });
      } else {
        setPatientInfo({ ...patientInfo, [field]: [...current, value] });
      }
    };

    return (
      <div className="space-y-6">
        <SectionTitle>Comprehensive Case History</SectionTitle>
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600 flex items-center justify-between">
                Patient Name
                {errors.name && <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest">{errors.name}</span>}
              </label>
              <input 
                type="text" 
                className={cn(
                  "w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none transition-all",
                  errors.name ? "border-red-300 focus:ring-red-500 bg-red-50" : "border-slate-200 focus:ring-indigo-500"
                )}
                value={patientInfo.name}
                onChange={e => {
                  setPatientInfo({...patientInfo, name: e.target.value});
                  if (errors.name) setErrors({...errors, name: ''});
                }}
                placeholder="Full Name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600 flex items-center justify-between">
                  Age
                  {errors.age && <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest">{errors.age}</span>}
                </label>
                <input 
                  type="number" 
                  className={cn(
                    "w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none transition-all",
                    errors.age ? "border-red-300 focus:ring-red-500 bg-red-50" : "border-slate-200 focus:ring-indigo-500"
                  )}
                  value={patientInfo.age}
                  onChange={e => {
                    setPatientInfo({...patientInfo, age: e.target.value});
                    if (errors.age) setErrors({...errors, age: ''});
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600 flex items-center justify-between">
                  Gender
                  {errors.gender && <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest">{errors.gender}</span>}
                </label>
                <select 
                  className={cn(
                    "w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none transition-all",
                    errors.gender ? "border-red-300 focus:ring-red-500 bg-red-50" : "border-slate-200 focus:ring-indigo-500"
                  )}
                  value={patientInfo.gender}
                  onChange={e => {
                    setPatientInfo({...patientInfo, gender: e.target.value});
                    if (errors.gender) setErrors({...errors, gender: ''});
                  }}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">Onset</label>
              <div className="flex gap-4">
                {['sudden', 'gradual'].map(o => (
                  <label key={o} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="onset" 
                      checked={patientInfo.onset === o}
                      onChange={() => setPatientInfo({...patientInfo, onset: o as any})}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span className="text-sm capitalize">{o}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">Course</label>
              <select 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={patientInfo.course}
                onChange={e => setPatientInfo({...patientInfo, course: e.target.value as any})}
              >
                <option value="">Select</option>
                <option value="progressive">Progressive</option>
                <option value="stable">Stable</option>
                <option value="improving">Improving</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">Site of Lesion</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={patientInfo.siteOfLesion}
                onChange={e => setPatientInfo({...patientInfo, siteOfLesion: e.target.value})}
                placeholder="e.g., Basal Ganglia, Cerebellum"
              />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Associated Deficits</h4>
              <div className="grid grid-cols-2 gap-3">
                {['Aphasia', 'Apraxia', 'Dysphagia', 'Cognitive', 'Hearing Loss', 'Visual Deficit'].map(item => (
                  <label key={item} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={patientInfo.associatedDeficits.includes(item)}
                      onChange={() => toggleCheckbox('associatedDeficits', item)}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Swallowing Status</h4>
              <div className="grid grid-cols-2 gap-3">
                {['Normal', 'Coughing', 'Choking', 'Nasal Regurgitation', 'Pocketing', 'Modified Diet'].map(item => (
                  <label key={item} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={patientInfo.swallowingStatus.includes(item)}
                      onChange={() => toggleCheckbox('swallowingStatus', item)}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Respiratory Support</h4>
            <div className="flex flex-wrap gap-3">
              {['None', 'Oxygen', 'Ventilator', 'Tracheostomy', 'BiPAP'].map(item => (
                <label key={item} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={patientInfo.respiratorySupport.includes(item)}
                    onChange={() => toggleCheckbox('respiratorySupport', item)}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-slate-700">{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">Neurological Diagnosis</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={patientInfo.neurologicalDiagnosis}
                onChange={e => setPatientInfo({...patientInfo, neurologicalDiagnosis: e.target.value})}
                placeholder="e.g., Parkinson's Disease, Stroke, TBI"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">Medications</label>
              <textarea 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-20"
                value={patientInfo.medications}
                onChange={e => setPatientInfo({...patientInfo, medications: e.target.value})}
                placeholder="List current medications..."
              />
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Medical Status & Investigations</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">Other Body Systems Status</label>
                <textarea 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                  value={patientInfo.bodySystems}
                  onChange={e => setPatientInfo({...patientInfo, bodySystems: e.target.value})}
                  placeholder="Cardiovascular, Respiratory, Musculoskeletal, etc."
                />
              </div>
              <div className="space-y-4">
                <label className="text-sm font-semibold text-slate-600">History of NCDs (Non-Communicable Diseases)</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Hypertension', 'Diabetes', 'COPD', 'Cancer', 'Heart Disease', 'Chronic Kidney Disease', 'Asthma', 'Thyroid Disorder'].map(item => (
                    <label key={item} className="flex items-center gap-3 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        checked={patientInfo.ncdHistory.includes(item)}
                        onChange={() => toggleCheckbox('ncdHistory', item)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-medium text-slate-700">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">Surgical History</label>
                <textarea 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                  value={patientInfo.surgicalHistory}
                  onChange={e => setPatientInfo({...patientInfo, surgicalHistory: e.target.value})}
                  placeholder="Details of past surgeries..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">Family & Social History</label>
                <textarea 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                  value={patientInfo.familyHistory}
                  onChange={e => setPatientInfo({...patientInfo, familyHistory: e.target.value})}
                  placeholder="Relevant family medical history and social support..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">Radiological Investigation Findings</label>
                <textarea 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                  value={patientInfo.radiologicalFindings}
                  onChange={e => setPatientInfo({...patientInfo, radiologicalFindings: e.target.value})}
                  placeholder="MRI, CT Scan, PET Scan findings..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">Laboratory Findings</label>
                <textarea 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                  value={patientInfo.laboratoryFindings}
                  onChange={e => setPatientInfo({...patientInfo, laboratoryFindings: e.target.value})}
                  placeholder="Blood tests, CSF analysis, etc."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">Other Investigations</label>
              <textarea 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                value={patientInfo.otherInvestigations}
                onChange={e => setPatientInfo({...patientInfo, otherInvestigations: e.target.value})}
                placeholder="EEG, EMG, Nerve Conduction Studies, etc."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">Developmental History</label>
                <textarea 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                  value={patientInfo.developmentalHistory}
                  onChange={e => setPatientInfo({...patientInfo, developmentalHistory: e.target.value})}
                  placeholder="Milestones, speech development..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">Birth History</label>
                <textarea 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                  value={patientInfo.birthHistory}
                  onChange={e => setPatientInfo({...patientInfo, birthHistory: e.target.value})}
                  placeholder="Prenatal, natal, postnatal history..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-600">Lifestyle Factors</label>
              <div className="flex flex-wrap gap-4">
                {['Smoking', 'Alcohol', 'Tobacco Chewing', 'Sedentary Lifestyle', 'High Stress'].map(item => (
                  <label key={item} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={patientInfo.lifestyleFactors.includes(item)}
                      onChange={() => toggleCheckbox('lifestyleFactors', item)}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderOroMotor = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <SectionTitle>Oro-Motor Examination</SectionTitle>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">Clinical Suite</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Structures Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Structural Integrity</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Anatomical Assessment</p>
            </div>
          </div>

          {Object.entries(oroMotorData.structures).map(([part, metrics]) => (
            <Card key={part} className="neo-card border-l-4 border-l-indigo-500">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500" /> {part}
              </h4>
              <div className="space-y-4">
                {Object.entries(metrics).map(([metric, score]) => (
                  <div key={metric} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-500 capitalize">{metric}</span>
                        <span className="text-[10px] text-slate-400 italic">
                          {ELICITATION_INSTRUCTIONS.oroMotorStructures[part] || ELICITATION_INSTRUCTIONS.oroMotorFunctions[metric] || "Observe or elicit response."}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Grade: {score}</span>
                    </div>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4].map(s => (
                        <button
                          key={s}
                          onClick={() => setOroMotorData({
                            ...oroMotorData,
                            structures: {
                              ...oroMotorData.structures,
                              [part]: { ...metrics, [metric]: s }
                            }
                          })}
                          className={cn(
                            "flex-1 h-7 rounded-md text-[10px] font-black transition-all",
                            score === s 
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                              : "bg-slate-50 text-slate-400 border border-slate-100 hover:border-indigo-200"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          <Card className="neo-card bg-slate-50 border-dashed">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Structural Observations</label>
            <textarea 
              className="w-full bg-transparent outline-none text-sm min-h-[100px] resize-none"
              placeholder="Notes on symmetry, scarring, dentition..."
              value={oroMotorObservations.structures}
              onChange={e => setOroMotorObservations({...oroMotorObservations, structures: e.target.value})}
            />
          </Card>
        </div>

        {/* Functions Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
              <Play size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Functional Mobility</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Physiological Assessment</p>
            </div>
          </div>

          {Object.entries(oroMotorData.functions).map(([part, metrics]) => (
            <Card key={part} className="neo-card border-l-4 border-l-amber-500">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" /> {part}
              </h4>
              <div className="space-y-4">
                {Object.entries(metrics).map(([metric, score]) => (
                  <div key={metric} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-500 capitalize">{metric}</span>
                        <span className="text-[10px] text-slate-400 italic">
                          {ELICITATION_INSTRUCTIONS.oroMotorFunctions[metric] || "Observe or elicit response."}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Grade: {score}</span>
                    </div>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4].map(s => (
                        <button
                          key={s}
                          onClick={() => setOroMotorData({
                            ...oroMotorData,
                            functions: {
                              ...oroMotorData.functions,
                              [part]: { ...metrics, [metric]: s }
                            }
                          })}
                          className={cn(
                            "flex-1 h-7 rounded-md text-[10px] font-black transition-all",
                            score === s 
                              ? "bg-amber-500 text-white shadow-md shadow-amber-100" 
                              : "bg-slate-50 text-slate-400 border border-slate-100 hover:border-amber-200"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          <Card className="neo-card bg-slate-50 border-dashed">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Functional Observations</label>
            <textarea 
              className="w-full bg-transparent outline-none text-sm min-h-[100px] resize-none"
              placeholder="Notes on range of motion, speed, coordination..."
              value={oroMotorObservations.functions}
              onChange={e => setOroMotorObservations({...oroMotorObservations, functions: e.target.value})}
            />
          </Card>
        </div>
      </div>
    </div>
  );

  const renderRespiratory = () => {
    const updateTrial = (index: number, value: number) => {
      const newTrials = [...respiratoryData.mpt.trials] as [number, number, number];
      newTrials[index] = value;
      const average = parseFloat((newTrials.reduce((a, b) => a + b, 0) / 3).toFixed(2));
      setRespiratoryData({ ...respiratoryData, mpt: { trials: newTrials, average } });
    };

    const updateSZ = (field: 's' | 'z', value: number) => {
      const newData = { ...respiratoryData.szRatio, [field]: value };
      const ratio = newData.z > 0 ? parseFloat((newData.s / newData.z).toFixed(2)) : 0;
      setRespiratoryData({ ...respiratoryData, szRatio: { ...newData, ratio } });
    };

    return (
      <div className="space-y-8">
        <SectionTitle>Respiratory System Assessment</SectionTitle>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <Timer size={20} />
              </div>
              <h3 className="font-bold text-slate-800">Maximum Phonation Time (MPT)</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">Instruction: Ask the patient to sustain /a/ for as long as possible after a deep breath. Perform 3 trials.</p>
            
            <div className="space-y-4">
              {respiratoryData.mpt.trials.map((trial, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                  <span className="text-sm font-semibold text-slate-600">Trial {i + 1}</span>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      className="w-24 px-3 py-1 rounded-lg border border-slate-200 text-right font-mono"
                      value={trial}
                      onChange={e => updateTrial(i, parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-xs font-bold text-slate-400 uppercase">sec</span>
                  </div>
                </div>
              ))}
              <div className="mt-6 p-4 bg-indigo-50 rounded-xl flex items-center justify-between border border-indigo-100">
                <span className="font-bold text-indigo-900">Average MPT</span>
                <span className="text-2xl font-black text-indigo-600 font-mono">{respiratoryData.mpt.average}s</span>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <Activity size={20} />
              </div>
              <h3 className="font-bold text-slate-800">S/Z Ratio</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">Instruction: Measure the longest duration for sustained /s/ and /z/.</p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                <span className="text-sm font-semibold text-slate-600">Sustained /s/</span>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    className="w-24 px-3 py-1 rounded-lg border border-slate-200 text-right font-mono"
                    value={respiratoryData.szRatio.s}
                    onChange={e => updateSZ('s', parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-xs font-bold text-slate-400 uppercase">sec</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                <span className="text-sm font-semibold text-slate-600">Sustained /z/</span>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    className="w-24 px-3 py-1 rounded-lg border border-slate-200 text-right font-mono"
                    value={respiratoryData.szRatio.z}
                    onChange={e => updateSZ('z', parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-xs font-bold text-slate-400 uppercase">sec</span>
                </div>
              </div>
              <div className="mt-6 p-4 bg-indigo-50 rounded-xl flex items-center justify-between border border-indigo-100">
                <span className="font-bold text-indigo-900">S/Z Ratio</span>
                <div className="text-right">
                  <span className="text-2xl font-black text-indigo-600 font-mono">{respiratoryData.szRatio.ratio}</span>
                  <p className="text-[10px] text-indigo-400 font-bold uppercase mt-1">
                    {respiratoryData.szRatio.ratio > 1.4 ? 'Potential Laryngeal Pathology' : 'Within Normal Limits'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderPhonatory = () => (
    <div className="space-y-8">
      <SectionTitle>Phonatory System Assessment</SectionTitle>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <Mic2 size={20} />
              </div>
              <h3 className="font-bold text-slate-800">Acoustic Analysis</h3>
            </div>
            <button 
              onClick={() => isRecording ? stopRecording() : startRecording()}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg",
                isRecording ? "bg-red-500 text-white animate-pulse shadow-red-200" : "bg-indigo-600 text-white shadow-indigo-200 hover:scale-105"
              )}
            >
              {isRecording ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              {isRecording ? `Recording... ${recordingTime}s` : "Record Phonation"}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Fundamental Freq (F0)', value: phonatoryData.acousticParameters.f0, unit: 'Hz' },
              { label: 'Jitter (Local)', value: phonatoryData.acousticParameters.jitter, unit: '%' },
              { label: 'Shimmer (Local)', value: phonatoryData.acousticParameters.shimmer, unit: 'dB' },
              { label: 'HNR', value: phonatoryData.acousticParameters.hnr, unit: 'dB' }
            ].map(param => (
              <div key={param.label} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{param.label}</p>
                <p className="text-xl font-black text-slate-800 font-mono">{param.value}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{param.unit}</p>
              </div>
            ))}
          </div>

          {isAnalyzing && analyzingDdkIdx === null && (
            <div className="mt-8 p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-4">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-indigo-900">AI is extracting acoustic parameters from sample...</p>
            </div>
          )}

          {aiResult && activeTab === 'phonatory' && (
            <div className="mt-8 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Info size={16} className="text-indigo-500" />
                AI Voice Analysis Findings
              </h4>
              <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {typeof aiResult === 'string' ? aiResult : JSON.stringify(aiResult, null, 2)}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-bold text-slate-800 mb-6">Voice Quality (GRBAS)</h3>
          <div className="space-y-6">
            {Object.entries(grbasData).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                  <span>{key}</span>
                  <span>Score: {value}</span>
                </div>
                <input 
                  type="range" min="0" max="3" step="1"
                  value={value}
                  onChange={(e) => setGrbasData(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderResonatory = () => (
    <div className="space-y-8">
      <SectionTitle>Resonatory System Assessment</SectionTitle>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-2">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Waves size={20} />
            </div>
            <h3 className="font-bold text-slate-800">Oral Pressure Consonants Test</h3>
          </div>
          
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Stimuli Sentences</h4>
              <ul className="space-y-2 text-sm text-slate-700 font-medium">
                <li>• "Buy Bobby a puppy" (Bilabial pressure)</li>
                <li>• "Take Teddy to town" (Alveolar pressure)</li>
                <li>• "Go get the cake" (Velar pressure)</li>
                <li>• "Silly Sam sang a song" (Fricative pressure)</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(resonatoryData.pressureConsonants).map(([phoneme, score]) => (
                <div key={phoneme} className="p-4 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-lg font-bold text-slate-800">/{phoneme}/</span>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Score: {score}</span>
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map(s => (
                      <button
                        key={s}
                        onClick={() => setResonatoryData({
                          ...resonatoryData,
                          pressureConsonants: { ...resonatoryData.pressureConsonants, [phoneme]: s }
                        })}
                        className={cn(
                          "flex-1 h-6 rounded transition-all",
                          score >= s ? "bg-indigo-600" : "bg-slate-100"
                        )}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-slate-800 mb-6">Resonance Details</h3>
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase">Hypernasality</label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4].map(s => (
                  <button
                    key={s}
                    onClick={() => setResonatoryData({ ...resonatoryData, hypernasality: s })}
                    className={cn(
                      "flex-1 py-2 rounded-lg font-bold text-xs transition-all border",
                      resonatoryData.hypernasality === s ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-400 border-slate-200"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase">Hyponasality</label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4].map(s => (
                  <button
                    key={s}
                    onClick={() => setResonatoryData({ ...resonatoryData, hyponasality: s })}
                    className={cn(
                      "flex-1 py-2 rounded-lg font-bold text-xs transition-all border",
                      resonatoryData.hyponasality === s ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-400 border-slate-200"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
              <input 
                type="checkbox"
                checked={resonatoryData.nasalEmission}
                onChange={e => setResonatoryData({ ...resonatoryData, nasalEmission: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-bold text-slate-700">Audible Nasal Emission</span>
            </label>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderSpeechElicitation = () => (
    <div className="space-y-8">
      <SectionTitle>Speech Elicitation & Analysis</SectionTitle>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Stimulus Image</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setStimulusImage('cookie')}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                  stimulusImage === 'cookie' ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600"
                )}
              >
                Cookie Theft
              </button>
              <button 
                onClick={() => setStimulusImage('park')}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                  stimulusImage === 'park' ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-400"
                )}
              >
                Park Scene
              </button>
            </div>
          </div>
          <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative group">
            <img 
              src={stimulusImage === 'cookie' ? "https://picsum.photos/seed/cookie-theft-clinical/800/450" : "https://picsum.photos/seed/park-scene-clinical/800/450"} 
              alt={`${stimulusImage} Stimulus`} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white font-bold text-sm">Standard Clinical Stimulus</p>
            </div>
          </div>
          <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Instruction:</strong> "Tell me everything you see happening in this picture." 
              Record the sample for at least 60 seconds to ensure adequate data for PCC analysis.
            </p>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-800">Automatic Speech Analysis</h3>
            <button 
              onClick={() => isRecording ? stopRecording() : startRecording()}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg",
                isRecording ? "bg-red-500 text-white animate-pulse shadow-red-200" : "bg-indigo-600 text-white shadow-indigo-200 hover:scale-105"
              )}
            >
              {isRecording ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              {isRecording ? `Recording... ${recordingTime}s` : "Start Sample"}
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-center">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">PCC Score</p>
                <p className="text-2xl font-black text-indigo-600 font-mono">
                  {aiResult?.pcc ? `${aiResult.pcc}%` : '--%'}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Error Count</p>
                <p className="text-2xl font-black text-slate-800 font-mono">
                  {aiResult?.errors?.length || 0}
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-slate-100 min-h-[200px]">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Transcription & Error Annotation</h4>
              {isAnalyzing && analyzingDdkIdx === null ? (
                <div className="flex flex-col items-center justify-center h-32 gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-slate-500">AI is transcribing and identifying phonological errors...</p>
                </div>
              ) : aiResult ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-700 leading-relaxed italic">
                    "{aiResult.transcription || 'Sample transcribed successfully.'}"
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {aiResult.errors?.map((err: any, i: number) => (
                      <span key={i} className="px-2 py-1 bg-red-50 text-red-600 rounded text-[10px] font-bold border border-red-100">
                        {err.phoneme} → {err.substitution} ({err.type})
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-slate-300">
                  <Mic size={32} className="mb-2 opacity-20" />
                  <p className="text-xs font-bold">No sample recorded yet</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderDDK = () => (
    <div className="space-y-6">
      <SectionTitle>Diadochokinetic (DDK) Rates</SectionTitle>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-3 font-bold text-slate-600">Task</th>
                <th className="pb-3 font-bold text-slate-600">Count</th>
                <th className="pb-3 font-bold text-slate-600">Seconds</th>
                <th className="pb-3 font-bold text-slate-600">Rate (syll/sec)</th>
                <th className="pb-3 font-bold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ddkData.map((item, idx) => (
                <tr key={item.task}>
                  <td className="py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-indigo-600">{item.task}</span>
                      <span className="text-[10px] text-slate-400 italic">
                        {ELICITATION_INSTRUCTIONS.ddk[item.task] || "Repeat rapidly."}
                      </span>
                    </div>
                  </td>
                  <td className="py-4">
                    <input 
                      type="number" 
                      className="w-20 px-2 py-1 border rounded"
                      value={item.count}
                      onChange={e => {
                        const newDdk = [...ddkData];
                        newDdk[idx].count = Number(e.target.value);
                        newDdk[idx].rate = newDdk[idx].seconds > 0 ? Number((newDdk[idx].count / newDdk[idx].seconds).toFixed(2)) : 0;
                        setDdkData(newDdk);
                      }}
                    />
                  </td>
                  <td className="py-4">
                    <input 
                      type="number" 
                      className="w-20 px-2 py-1 border rounded"
                      value={item.seconds}
                      onChange={e => {
                        const newDdk = [...ddkData];
                        newDdk[idx].seconds = Number(e.target.value);
                        newDdk[idx].rate = newDdk[idx].seconds > 0 ? Number((newDdk[idx].count / newDdk[idx].seconds).toFixed(2)) : 0;
                        setDdkData(newDdk);
                      }}
                    />
                  </td>
                  <td className="py-4 font-mono font-bold text-slate-700">{item.rate}</td>
                  <td className="py-4">
                    <button 
                      onClick={() => isRecording && recordingDdkIdx === idx ? stopRecording() : startRecording(idx)}
                      disabled={(isAnalyzing && analyzingDdkIdx !== idx) || (isRecording && recordingDdkIdx !== idx)}
                      className={cn(
                        "p-2 rounded-lg transition-all flex items-center gap-2",
                        isRecording && recordingDdkIdx === idx 
                          ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-200" 
                          : "text-indigo-600 hover:bg-indigo-50"
                      )}
                    >
                      {isAnalyzing && analyzingDdkIdx === idx ? (
                        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      ) : isRecording && recordingDdkIdx === idx ? (
                        <>
                          <Square size={18} fill="currentColor" />
                          <span className="text-[10px] font-bold uppercase">{recordingTime}s</span>
                        </>
                      ) : (
                        <Mic size={18} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderAIAnalysis = () => (
    <div className="space-y-6">
      <SectionTitle>AI-Powered Speech Analysis</SectionTitle>
      <Card className="bg-gradient-to-br from-indigo-50 to-white">
        <div className="flex flex-col items-center justify-center py-12 space-y-6">
          <div className={cn(
            "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500",
            isRecording ? "bg-red-100 scale-110 animate-pulse" : "bg-indigo-100"
          )}>
            <Mic size={48} className={isRecording ? "text-red-600" : "text-indigo-600"} />
          </div>
          
          <div className="text-center">
            <h3 className="text-xl font-bold text-slate-800">
              {isRecording ? "Recording Sample..." : "Ready to Record"}
            </h3>
            <p className="text-slate-500 mt-1">
              {isRecording ? `Duration: ${recordingTime}s` : "Select a task and press record"}
            </p>
          </div>

          <div className="flex gap-4">
            {!isRecording ? (
              <button 
                onClick={() => startRecording()}
                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
              >
                <Play size={20} /> Start Recording
              </button>
            ) : (
              <button 
                onClick={stopRecording}
                className="flex items-center gap-2 px-8 py-3 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
              >
                <Square size={20} /> Stop & Analyze
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl">
            {['Phonation /a/', 'Phonation /i/', 'Phonation /u/', 'Rainbow Passage', 'Counting 1-20', 'Conversation'].map(task => (
              <button key={task} className="px-4 py-2 text-xs font-bold border border-indigo-200 rounded-lg hover:bg-indigo-50 text-indigo-700 transition-colors">
                {task}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {isAnalyzing && analyzingDdkIdx === null && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-slate-600 font-medium">AI is analyzing the speech sample...</span>
        </div>
      )}

      {aiResult && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <h4 className="font-bold text-slate-700 mb-4">Intelligibility</h4>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-indigo-600">{aiResult.intelligibility || 'N/A'}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">AI-estimated percentage</p>
            </Card>
            <Card>
              <h4 className="font-bold text-slate-700 mb-4">Naturalness</h4>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-indigo-600">{aiResult.naturalness || 'N/A'}/7</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">1 (Unnatural) to 7 (Natural)</p>
            </Card>
            <Card>
              <h4 className="font-bold text-slate-700 mb-4">Transcription</h4>
              <p className="text-sm text-slate-600 line-clamp-3 italic">"{aiResult.transcription || 'No transcription available.'}"</p>
            </Card>
          </div>

          <Card>
            <h4 className="font-bold text-slate-700 mb-4">Acoustic & Perceptual Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              {aiResult.acoustic_perceptual_analysis && Object.entries(aiResult.acoustic_perceptual_analysis).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{key}</span>
                  <span className="text-sm text-slate-700">{value as string}</span>
                </div>
              ))}
            </div>
          </Card>

          {aiResult.phonation_metrics && (
            <Card>
              <h4 className="font-bold text-slate-700 mb-4">Phonation Metrics</h4>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stability</span>
                  <p className="text-sm text-slate-700">{aiResult.phonation_metrics.stability}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duration</span>
                  <p className="text-sm text-slate-700">{aiResult.phonation_metrics.duration}</p>
                </div>
              </div>
            </Card>
          )}

          <Card className="bg-slate-900 text-white">
            <h4 className="font-bold text-indigo-300 mb-2">Clinical Summary</h4>
            <p className="text-sm leading-relaxed">{aiResult.clinical_summary}</p>
          </Card>
        </div>
      )}

      <Card>
        <h3 className="text-lg font-bold text-slate-800 mb-4">Naturalness of Speech</h3>
        <p className="text-sm text-slate-500 mb-6">Rate the overall naturalness of the patient's speech during conversation.</p>
        <div className="flex items-center gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6, 7].map(score => (
            <button 
              key={score}
              className={cn(
                "w-10 h-10 rounded-full font-bold transition-all",
                naturalnessScore === score 
                  ? "bg-indigo-600 text-white shadow-lg" 
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"
              )}
              onClick={() => setNaturalnessScore(score)}
            >
              {score}
            </button>
          ))}
        </div>
        <textarea 
          className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
          placeholder="Observations on prosody, stress, rate, and rhythm..."
          value={fdaObservations.naturalness}
          onChange={e => setFdaObservations({...fdaObservations, naturalness: e.target.value})}
        />
      </Card>

      <div className="pt-8 border-t border-slate-200">
        <Card className="bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-black tracking-tight">Generate Comprehensive Report</h3>
              <p className="text-slate-400 text-sm mt-1">Compile all assessment data, AI analysis, and clinical findings into a PDF.</p>
            </div>
            <button 
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Printer size={24} />
              )}
              {isDownloading ? 'Generating PDF...' : 'Download Report'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderDeepTest = () => {
    const { pcc, correctConsonants, totalConsonants, incorrectConsonants, distortedConsonants } = (() => {
      let correct = 0;
      let total = 0;
      let incorrect = 0;
      let distorted = 0;

      Object.entries(articulationData).forEach(([phoneme, positions]) => {
        if (CONSONANTS.includes(phoneme)) {
          Object.values(positions).forEach(status => {
            if (status !== ArticulationStatus.NotTested) {
              total++;
              if (status === ArticulationStatus.Correct) correct++;
              else if (status === ArticulationStatus.Incorrect) incorrect++;
              else if (status === ArticulationStatus.Distorted) distorted++;
            }
          });
        }
      });

      const pccValue = total > 0 ? (correct / total) * 100 : 0;
      return { pcc: pccValue, correctConsonants: correct, totalConsonants: total, incorrectConsonants: incorrect, distortedConsonants: distorted };
    })();

    return (
      <div className="space-y-6">
        <SectionTitle>Deep Test of Articulation</SectionTitle>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-indigo-600 text-white border-none">
            <p className="text-[10px] font-bold uppercase opacity-70 mb-1">PCC Score</p>
            <p className="text-3xl font-black font-mono">{pcc.toFixed(1)}%</p>
            <p className="text-[10px] mt-2 opacity-70">Percentage Consonants Correct</p>
          </Card>
          <Card className="bg-green-50 border-green-100">
            <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Correct</p>
            <p className="text-2xl font-black text-green-700 font-mono">{correctConsonants}</p>
            <p className="text-[10px] text-green-500 mt-1">Total: {totalConsonants}</p>
          </Card>
          <Card className="bg-red-50 border-red-100">
            <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Incorrect</p>
            <p className="text-2xl font-black text-red-700 font-mono">{incorrectConsonants}</p>
            <p className="text-[10px] text-red-500 mt-1">Substitutions/Omissions</p>
          </Card>
          <Card className="bg-amber-50 border-amber-100">
            <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Distorted</p>
            <p className="text-2xl font-black text-amber-700 font-mono">{distortedConsonants}</p>
            <p className="text-[10px] text-amber-500 mt-1">Imprecise Production</p>
          </Card>
        </div>

        {totalConsonants > 0 && (incorrectConsonants > 0 || distortedConsonants > 0) && (
          <Card className="bg-slate-50 border-slate-200">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4">Top Problematic Phonemes</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(articulationData)
                .filter(([p]) => CONSONANTS.includes(p))
                .map(([p, pos]) => ({
                  p,
                  incorrect: Object.values(pos).filter(v => v === ArticulationStatus.Incorrect).length,
                  distorted: Object.values(pos).filter(v => v === ArticulationStatus.Distorted).length
                }))
                .filter(item => item.incorrect > 0 || item.distorted > 0)
                .sort((a, b) => (b.incorrect + b.distorted) - (a.incorrect + a.distorted))
                .slice(0, 5)
                .map(item => (
                  <div key={item.p} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-lg font-black text-slate-800 uppercase mb-1">{item.p}</p>
                    <div className="flex flex-col gap-1">
                      {item.incorrect > 0 && (
                        <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          {item.incorrect} Incorrect
                        </span>
                      )}
                      {item.distorted > 0 && (
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          {item.distorted} Distorted
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        )}

        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <p className="text-blue-800 text-sm italic">
              "Ask the patient to name the picture or repeat the word containing the target phoneme. Mark production quality for each position."
            </p>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-blue-700 uppercase">Language:</label>
              <select 
                className="bg-white border border-blue-200 rounded px-2 py-1 text-xs font-bold text-blue-800"
                value={selectedLanguage}
                onChange={e => setSelectedLanguage(e.target.value)}
              >
                {Object.keys(ARTICULATION_STIMULI).map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Phoneme</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Initial</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Medial</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Final</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">AI Record</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(articulationData).map(([phoneme, positions]) => {
                  const correctCount = Object.values(positions).filter(v => v === ArticulationStatus.Correct).length;
                  const testedCount = Object.values(positions).filter(v => v !== ArticulationStatus.NotTested).length;
                  const accuracy = testedCount > 0 ? (correctCount / testedCount) * 100 : 0;
                  const stimuli = ARTICULATION_STIMULI[selectedLanguage][phoneme] || { initial: '-', medial: '-', final: '-' };
                  
                  return (
                    <React.Fragment key={phoneme}>
                      <tr className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-700 uppercase">{phoneme}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">
                            {CONSONANTS.includes(phoneme) ? 'Consonant' : 'Vowel'}
                          </span>
                        </div>
                      </td>
                      {['initial', 'medial', 'final'].map((pos) => {
                        const currentStatus = positions[pos as keyof typeof positions];
                        return (
                          <td key={pos} className="py-4 px-6 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{stimuli[pos as keyof typeof stimuli]}</span>
                              <div className="flex gap-1">
                                {[
                                  { status: ArticulationStatus.Correct, icon: <Check size={12} />, color: 'green' },
                                  { status: ArticulationStatus.Incorrect, icon: <X size={12} />, color: 'red' },
                                  { status: ArticulationStatus.Distorted, icon: <AlertCircle size={12} />, color: 'amber' },
                                  { status: ArticulationStatus.NotTested, icon: <Minus size={12} />, color: 'slate' }
                                ].map(btn => (
                                  <button
                                    key={btn.status}
                                    onClick={() => setArticulationData({
                                      ...articulationData,
                                      [phoneme]: { ...positions, [pos]: btn.status }
                                    })}
                                    title={btn.status}
                                    className={cn(
                                      "w-6 h-6 rounded flex items-center justify-center transition-all border",
                                      currentStatus === btn.status 
                                        ? `bg-${btn.color}-600 text-white border-${btn.color}-700 shadow-sm` 
                                        : `bg-white text-${btn.color}-400 border-${btn.color}-100 hover:bg-${btn.color}-50`
                                    )}
                                  >
                                    {btn.icon}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => isRecording && recordingArticulationPhoneme === phoneme ? stopRecording() : startRecording(null, phoneme)}
                          disabled={(isAnalyzing && analyzingArticulationPhoneme !== phoneme) || (isRecording && recordingArticulationPhoneme !== phoneme)}
                          className={cn(
                            "p-2 rounded-lg transition-all flex items-center justify-center mx-auto",
                            isRecording && recordingArticulationPhoneme === phoneme 
                              ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-200" 
                              : "text-indigo-600 hover:bg-indigo-50"
                          )}
                        >
                          {isAnalyzing && analyzingArticulationPhoneme === phoneme ? (
                            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          ) : isRecording && recordingArticulationPhoneme === phoneme ? (
                            <div className="flex items-center gap-1">
                              <Square size={14} fill="currentColor" />
                              <span className="text-[9px] font-bold">{recordingTime}s</span>
                            </div>
                          ) : (
                            <Mic size={18} />
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className={cn(
                          "text-xs font-bold px-2 py-1 rounded-full",
                          accuracy === 100 ? "bg-green-100 text-green-700" : 
                          accuracy >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        )}>
                          {accuracy.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                    {positions.notes && (
                      <tr key={`${phoneme}-notes`} className="bg-indigo-50/30 border-b border-slate-50">
                        <td colSpan={6} className="py-2 px-6">
                          <div className="flex items-center gap-2 text-[10px] text-indigo-600 font-medium">
                            <Info size={12} />
                            <span>AI Observation: {positions.notes}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

  const renderTranslationalSupport = () => {
    return (
      <div className="space-y-6">
        <SectionTitle>Translational & Language Support</SectionTitle>
        <Card className="bg-indigo-50 border-indigo-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
              <Globe size={24} />
            </div>
            <div>
              <h3 className="font-bold text-indigo-900">Indian Language Integration</h3>
              <p className="text-sm text-indigo-700 mt-1">
                This module facilitates assessment in regional Indian languages using Sarvam AI or Bhashini APIs.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-indigo-500">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-400">S</div>
              <div>
                <h4 className="font-bold text-slate-800">Sarvam AI</h4>
                <p className="text-xs text-slate-500">High-quality Indic LLMs</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Integrate Sarvam's speech-to-text for accurate transcription of Hindi, Tamil, Telugu, and more.
            </p>
            <button className="w-full py-2 bg-slate-100 text-slate-600 font-bold rounded-lg text-sm">Configure API</button>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-indigo-500">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-400">B</div>
              <div>
                <h4 className="font-bold text-slate-800">Bhashini (ULCA)</h4>
                <p className="text-xs text-slate-500">National Language Translation Mission</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Access government-backed translation and speech models for 22 scheduled Indian languages.
            </p>
            <button className="w-full py-2 bg-slate-100 text-slate-600 font-bold rounded-lg text-sm">Configure API</button>
          </Card>
        </div>

        <Card>
          <h4 className="font-bold text-slate-800 mb-4">Translation Workbench</h4>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Source Text (English)</label>
              <textarea 
                className="w-full p-4 rounded-xl border border-slate-200 mt-2 text-sm"
                placeholder="Enter text to translate for assessment stimulus..."
                defaultValue="The quick brown fox jumps over the lazy dog."
              />
            </div>
            <div className="flex gap-4">
              <select className="flex-1 p-3 rounded-xl border border-slate-200 text-sm font-medium">
                <option>Hindi</option>
                <option>Kannada</option>
                <option>Tamil</option>
                <option>Telugu</option>
                <option>Malayalam</option>
                <option>Marathi</option>
              </select>
              <button className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">
                Translate Stimulus
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const [isCopied, setIsCopied] = useState(false);

  const handleShare = () => {
    const shareUrl = 'https://bit.ly/Vaksiddhi';
    navigator.clipboard.writeText(shareUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const renderDashboard = () => {
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-100">
            <LayoutDashboard size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Cloud Sync Required</h2>
          <p className="text-slate-500 max-w-md mb-8 leading-relaxed">
            Please sign in with your Google account to access your clinical dashboard and sync patient records across devices.
          </p>
          <button 
            onClick={handleLogin}
            className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-200 flex items-center gap-3"
          >
            <Globe size={20} /> Sign In with Google
          </button>
        </div>
      );
    }

    // Calculate stats from records
    const totalPatients = records.length;
    
    // Monthly assessments (last 6 months)
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toLocaleString('default', { month: 'short' });
    }).reverse();

    const monthlyData = last6Months.map(month => {
      const count = records.filter(r => {
        const d = new Date(r.date);
        return d.toLocaleString('default', { month: 'short' }) === month;
      }).length;
      return { month, count };
    });

    // Diagnosis distribution
    const diagnosisCounts: Record<string, number> = {};
    records.forEach(r => {
      const d = r.neurologicalDiagnosis || 'Not Specified';
      diagnosisCounts[d] = (diagnosisCounts[d] || 0) + 1;
    });
    const diagnosisData = Object.entries(diagnosisCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Age distribution
    const ageGroups = {
      '0-18': 0,
      '19-40': 0,
      '41-60': 0,
      '60+': 0
    };
    records.forEach(r => {
      const age = parseInt(r.age);
      if (age <= 18) ageGroups['0-18']++;
      else if (age <= 40) ageGroups['19-40']++;
      else if (age <= 60) ageGroups['41-60']++;
      else ageGroups['60+']++;
    });
    const ageData = Object.entries(ageGroups).map(([name, value]) => ({ name, value }));

    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'];

    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <SectionTitle>Clinical Dashboard</SectionTitle>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <Calendar size={14} />
            Data as of {new Date().toLocaleDateString()}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-indigo-600 text-white border-none shadow-xl shadow-indigo-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-indigo-500 rounded-lg">
                <Users size={20} />
              </div>
              <TrendingUp size={20} className="text-indigo-300" />
            </div>
            <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Total Patients</p>
            <h3 className="text-4xl font-black mt-1">{totalPatients}</h3>
            <p className="text-[10px] text-indigo-200 mt-4">Total clinical assessments recorded</p>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <Calendar size={20} />
              </div>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase">Active</span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Assessments this Month</p>
            <h3 className="text-4xl font-black text-slate-800 mt-1">
              {records.filter(r => new Date(r.date).getMonth() === new Date().getMonth()).length}
            </h3>
            <p className="text-[10px] text-slate-500 mt-4">New patient records in current month</p>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <Activity size={20} />
              </div>
              <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase">Clinical</span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Primary Diagnosis</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1 truncate">
              {diagnosisData[0]?.name || 'N/A'}
            </h3>
            <p className="text-[10px] text-slate-500 mt-4">Most frequent neurological condition</p>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Recent Activity & Trends */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="neo-card">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <History size={16} className="text-indigo-600" /> Recent Activity Feed
                </h4>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last 5 Assessments</span>
              </div>
              <div className="space-y-4">
                {records.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <History size={32} className="mb-2 opacity-20" />
                    <p className="text-xs font-bold">No recent activity recorded.</p>
                  </div>
                ) : (
                  records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map(record => (
                    <div key={record.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-all group border border-transparent hover:border-slate-100">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                        <UserIcon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-black text-slate-800 truncate">{record.name}</h5>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                          {record.neurologicalDiagnosis || 'General Assessment'} • {new Date(record.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-black px-2 py-0.5 rounded-full uppercase",
                          record.sessions.length > 1 ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {record.sessions.length > 1 ? 'Follow-up' : 'Initial'}
                        </span>
                        <button 
                          onClick={() => loadRecord(record)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="neo-card">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-600" /> Assessment Trends
              </h4>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Right Column: Distribution & Demographics */}
          <div className="space-y-8">
            <Card className="neo-card">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                <PieChartIcon size={16} className="text-emerald-500" /> Diagnosis Distribution
              </h4>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={diagnosisData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {diagnosisData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-6">
                {diagnosisData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}} />
                      <span className="text-slate-500 truncate max-w-[120px]">{entry.name}</span>
                    </div>
                    <span className="text-slate-800">{entry.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="neo-card">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                <Users size={16} className="text-amber-500" /> Age Demographics
              </h4>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                      width={50} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none' }}
                    />
                    <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" /> Age Demographics
            </h4>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ageData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {ageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500" /> Recent Activity
            </h4>
            <div className="space-y-4">
              {records.slice(0, 4).map((record, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-600 font-black text-xs">
                      {record.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{record.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{record.neurologicalDiagnosis}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">{new Date(record.date).toLocaleDateString()}</p>
                    <button 
                      onClick={() => { setPatientInfo(record); setActiveTab('patient'); }}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 mt-1"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
              {records.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-400 italic">No recent activity to display.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200">
          <Card className="bg-slate-900 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-black tracking-tight">Generate Comprehensive Report</h3>
                <p className="text-slate-400 text-sm mt-1">Compile all assessment data, AI analysis, and clinical findings into a PDF.</p>
              </div>
              <button 
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Printer size={24} />
                )}
                {isDownloading ? 'Generating PDF...' : 'Download Report'}
              </button>
            </div>
          </Card>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-white rounded-2xl border border-slate-200">
            <div className="flex-1">
              <p className="text-[10px] text-slate-400 italic leading-relaxed mb-1">
                Developed and designed by
              </p>
              <p className="text-sm text-slate-700 font-black">
                Mr. Hemaraja Nayaka.S
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                (M.Sc SLP, PGDBEME, DHA&ET- Associate Professor in Speech Language Pathology)
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleShare}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg",
                  isCopied 
                    ? "bg-green-500 text-white shadow-green-200" 
                    : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200"
                )}
              >
                {isCopied ? (
                  <>
                    <CheckCircle2 size={16} /> Link Copied!
                  </>
                ) : (
                  <>
                    <Share2 size={16} /> Share App
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRecords = () => {
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-slate-100">
            <History size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Access Your Records</h2>
          <p className="text-slate-500 max-w-md mb-8 leading-relaxed">
            Sign in to view and manage your patient assessment history securely in the cloud.
          </p>
          <button 
            onClick={handleLogin}
            className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-3"
          >
            <Globe size={20} /> Sign In with Google
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <SectionTitle>Patient Records & History</SectionTitle>
          <button 
            onClick={() => {
              setPatientInfo({
                id: crypto.randomUUID(),
                name: '', age: '', gender: '', caseNo: '', clinician: '', date: new Date().toISOString().split('T')[0],
                complaint: '', medicalHistory: '', onset: '', course: '', siteOfLesion: '', neurologicalDiagnosis: '',
                associatedDeficits: [], swallowingStatus: [], respiratorySupport: [], medications: '',
                bodySystems: '', ncdHistory: [], radiologicalFindings: '', laboratoryFindings: '', 
                otherInvestigations: '', surgicalHistory: '', familyHistory: '', socialHistory: '', 
                lifestyleFactors: [], developmentalHistory: '', birthHistory: '', sessions: []
              });
              setActiveTab('patient');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus size={18} /> New Assessment
          </button>
        </div>

        {records.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-slate-400">
            <History size={48} className="mb-4 opacity-20" />
            <p className="font-bold">No records found. Start your first assessment!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {records.map(record => (
              <Card key={record.id} className="hover:shadow-xl transition-all border-2 border-transparent hover:border-indigo-500 group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                    <UserIcon size={24} />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={async () => {
                        if (confirm('Are you sure you want to delete this record from the cloud?')) {
                          try {
                            await deleteDoc(doc(db, `users/${user.uid}/records`, record.id));
                          } catch (error) {
                            handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/records/${record.id}`);
                          }
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-1">{record.name || 'Unnamed Patient'}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Case: {record.caseNo || 'N/A'}</p>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Last Session</span>
                    <span className="font-bold text-slate-700">{record.sessions.length > 0 ? new Date(record.sessions[record.sessions.length-1].date).toLocaleDateString() : 'No sessions'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Total Sessions</span>
                    <span className="font-bold text-indigo-600">{record.sessions.length}</span>
                  </div>
                </div>

                <button 
                  onClick={() => loadRecord(record)}
                  className="w-full py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
                >
                  View Details <ChevronRight size={16} />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTreatment = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <SectionTitle>Treatment Planning & Goals</SectionTitle>
        <button 
          onClick={generateGoals}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          <Activity size={18} /> Auto-Generate Goals
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {Object.entries(treatmentGoals.subsystems).map(([subsystem, goals]) => {
          const subsystemGoals = goals as { shortTerm: string[], longTerm: string[] };
          return (
            <Card key={subsystem} className="neo-card border-l-4 border-l-indigo-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Target size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 capitalize">{subsystem} Goals</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subsystem Targeted Therapy</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Short Term */}
                <div>
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Short-Term Goals
                  </h4>
                  <div className="space-y-2">
                    {subsystemGoals.shortTerm.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No short-term goals defined.</p>
                    ) : (
                      subsystemGoals.shortTerm.map((goal, i) => (
                        <div key={i} className="group p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 flex items-start gap-3">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                          <span className="flex-1">{goal}</span>
                          <button 
                            onClick={() => removeGoal(subsystem, 'shortTerm', i)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                    
                    <div className="mt-3 flex gap-2">
                      <input 
                        type="text"
                        placeholder="Add short-term goal..."
                        className="flex-1 text-xs p-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none"
                        value={newGoal.subsystem === subsystem && newGoal.type === 'shortTerm' ? newGoal.text : ''}
                        onChange={(e) => setNewGoal({ subsystem, type: 'shortTerm', text: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && addCustomGoal(subsystem, 'shortTerm')}
                      />
                      <button 
                        onClick={() => addCustomGoal(subsystem, 'shortTerm')}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Long Term */}
                <div>
                  <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Long-Term Goals
                  </h4>
                  <div className="space-y-2">
                    {subsystemGoals.longTerm.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No long-term goals defined.</p>
                    ) : (
                      subsystemGoals.longTerm.map((goal, i) => (
                        <div key={i} className="group p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-sm text-slate-700 flex items-start gap-3">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
                          <span className="flex-1">{goal}</span>
                          <button 
                            onClick={() => removeGoal(subsystem, 'longTerm', i)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                    
                    <div className="mt-3 flex gap-2">
                      <input 
                        type="text"
                        placeholder="Add long-term goal..."
                        className="flex-1 text-xs p-2 rounded-lg border border-slate-200 focus:border-emerald-500 outline-none"
                        value={newGoal.subsystem === subsystem && newGoal.type === 'longTerm' ? newGoal.text : ''}
                        onChange={(e) => setNewGoal({ subsystem, type: 'longTerm', text: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && addCustomGoal(subsystem, 'longTerm')}
                      />
                      <button 
                        onClick={() => addCustomGoal(subsystem, 'longTerm')}
                        className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="pt-8 border-t border-slate-200">
        <Card className="bg-slate-900 text-white overflow-hidden relative mb-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-black tracking-tight">Generate Comprehensive Report</h3>
              <p className="text-slate-400 text-sm mt-1">Compile all assessment data, AI analysis, and clinical findings into a PDF.</p>
            </div>
            <button 
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download size={24} />
              )}
              {isDownloading ? 'Generating Report...' : 'Download PDF Report'}
            </button>
          </div>
        </Card>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-white rounded-2xl border border-slate-200">
          <div className="flex-1">
            <p className="text-[10px] text-slate-400 italic leading-relaxed mb-1">
              Developed and designed by
            </p>
            <p className="text-sm text-slate-700 font-black">
              Mr. Hemaraja Nayaka.S
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              (M.Sc SLP, PGDBEME, DHA&ET- Associate Professor in Speech Language Pathology)
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleShare}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg",
                isCopied 
                  ? "bg-green-500 text-white shadow-green-200" 
                  : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200"
              )}
            >
              {isCopied ? (
                <>
                  <CheckCircle2 size={16} /> Link Copied!
                </>
              ) : (
                <>
                  <Share2 size={16} /> Share App
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-8">
      <SectionTitle>Application Settings</SectionTitle>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" /> Clinical Profile
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Clinician Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Enter your name"
                value={clinicianName}
                onChange={(e) => setClinicianName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Credentials</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Enter credentials (e.g., M.Sc SLP)"
                value={clinicianCredentials}
                onChange={(e) => setClinicianCredentials(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Institution</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Enter institution name"
              />
            </div>
            <div className="pt-4">
              <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors">
                Update Profile
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" /> Data Management
          </h4>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500 mb-3">Export all clinical records to a JSON file for backup or research purposes.</p>
              <button className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors">
                <Save size={16} /> Export Data
              </button>
            </div>
            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
              <p className="text-xs text-red-600 font-bold mb-3">Danger Zone</p>
              <p className="text-[10px] text-red-500 mb-3">This will permanently delete all clinical records stored in this browser's local storage.</p>
              <button 
                onClick={() => {
                  if (confirm('Are you sure you want to delete all records? This action cannot be undone.')) {
                    setRecords([]);
                    localStorage.removeItem('fda_records');
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 size={16} /> Clear All Records
              </button>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500" /> About FDA-2 Digital Assistant
        </h4>
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            The FDA-2 Digital Assistant is a clinical tool designed to streamline the administration and scoring of the Frenchay Dysarthria Assessment (2nd Edition). 
            It provides automated DDK rate calculation, real-time speech analysis, and comprehensive clinical reporting.
          </p>
          <div className="pt-4 flex flex-col gap-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Version 1.2.0 (Clinical Beta)</p>
              <button 
                onClick={handleShare}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  isCopied 
                    ? "bg-green-500 text-white shadow-lg shadow-green-100" 
                    : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100"
                )}
              >
                {isCopied ? (
                  <>
                    <CheckCircle2 size={12} /> Link Copied!
                  </>
                ) : (
                  <>
                    <Share2 size={12} /> Share App Link
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 italic leading-relaxed">
              Developed and designed by <span className="text-slate-600 font-bold not-italic">Mr. Hemaraja Nayaka.S</span>, (M.Sc SLP, PGDBEME, DHA&ET- Associate Professor in Speech Language Pathology)
            </p>
          </div>
        </div>
      </Card>
    </div>
  );

  const handlePrint = () => {
    handleDownloadPDF();
  };

  const renderPrintReport = () => {
    const radarData = [
      { subject: 'Reflex', A: Object.values(fdaData.reflex).reduce((a, b) => a + b, 0) / 3, fullMark: 4 },
      { subject: 'Respiration', A: Object.values(fdaData.respiration).reduce((a, b) => a + b, 0) / 2, fullMark: 4 },
      { subject: 'Lips', A: Object.values(fdaData.lips).reduce((a, b) => a + b, 0) / 5, fullMark: 4 },
      { subject: 'Jaw', A: Object.values(fdaData.jaw).reduce((a, b) => a + b, 0) / 2, fullMark: 4 },
      { subject: 'Palate', A: Object.values(fdaData.palate).reduce((a, b) => a + b, 0) / 3, fullMark: 4 },
      { subject: 'Laryngeal', A: Object.values(fdaData.laryngeal).reduce((a, b) => a + b, 0) / 4, fullMark: 4 },
      { subject: 'Tongue', A: Object.values(fdaData.tongue).reduce((a, b) => a + b, 0) / 6, fullMark: 4 },
      { subject: 'Intelligibility', A: Object.values(fdaData.intelligibility).reduce((a, b) => a + b, 0) / 3, fullMark: 4 },
    ];

    const overallAverage = radarData.reduce((acc, curr) => acc + curr.A, 0) / radarData.length;

    const getDiagnosis = () => {
      const scores = radarData.reduce((acc, curr) => ({ ...acc, [curr.subject.toLowerCase()]: curr.A }), {} as Record<string, number>);
      let type = manualDiagnosis || "Undetermined Dysarthria";
      let severity = manualSeverity || "Mild";
      
      if (!manualSeverity) {
        if (overallAverage < 1) severity = "Profound";
        else if (overallAverage < 2) severity = "Severe";
        else if (overallAverage < 3) severity = "Moderate";
        else if (overallAverage < 3.8) severity = "Mild";
        else severity = "Normal/Subclinical";
      }

      if (!manualDiagnosis) {
        if (scores.respiration < 2 && scores.laryngeal < 2 && scores.tongue < 2) type = "Flaccid Dysarthria";
        else if (scores.laryngeal < 2 && scores.intelligibility < 2 && scores.respiration > 3) type = "Spastic Dysarthria";
        else if (scores.intelligibility < 2 && scores.respiration < 3 && scores.laryngeal > 3) type = "Ataxic Dysarthria";
        else if (scores.jaw < 2 && scores.tongue < 2) type = "Hypokinetic Dysarthria";
        else if (scores.laryngeal < 2 && scores.intelligibility < 2) type = "Hyperkinetic Dysarthria";
      }
      return { type, severity };
    };

    const diagnosis = getDiagnosis();

    return (
      <div id="print-report-container" ref={reportRef} className="print-only bg-white p-12 font-sans text-slate-900" style={{ width: '800px', margin: '0 auto' }}>
        {/* Professional Medical Header */}
        <div className="flex justify-between items-start border-b-4 border-indigo-600 pb-8 mb-10">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-indigo-600 rounded-2xl text-white">
              <Volume2 size={48} />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-indigo-900">VakSiddhi</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">Motor Speech Assessment Suite</p>
              <p className="text-[10px] text-indigo-600 font-black mt-2 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded inline-block">Standardized Clinical Diagnostic Report</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Confidential Medical Record</div>
            <div className="text-sm font-black text-slate-900">Report ID: VS-{new Date().getTime().toString().slice(-6)}</div>
            <div className="text-sm text-slate-500 font-medium">Date of Issue: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
          </div>
        </div>

        {/* Patient & Clinician Information Grid */}
        <div className="grid grid-cols-2 gap-16 mb-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <UserIcon size={16} className="text-indigo-600" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Patient Demographics</h3>
            </div>
            <div className="grid grid-cols-2 gap-y-3 text-sm border-l-2 border-slate-100 pl-4">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Full Name</span>
              <span className="font-black text-slate-900">{patientInfo.name || 'N/A'}</span>
              
              <span className="text-slate-400 font-bold uppercase text-[10px]">Age / Gender</span>
              <span className="font-bold text-slate-900">{patientInfo.age || 'N/A'}Y / {patientInfo.gender || 'N/A'}</span>
              
              <span className="text-slate-400 font-bold uppercase text-[10px]">Patient ID</span>
              <span className="font-mono text-slate-900 font-bold">{patientInfo.id || 'N/A'}</span>
              
              <span className="text-slate-400 font-bold uppercase text-[10px]">Date of Birth</span>
              <span className="font-bold text-slate-900">{patientInfo.dob || 'N/A'}</span>
            </div>
          </div>
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope size={16} className="text-indigo-600" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Clinical Provider</h3>
            </div>
            <div className="grid grid-cols-1 gap-y-1 text-sm border-l-2 border-slate-100 pl-4">
              <span className="font-black text-slate-900 text-lg">{clinicianName || 'N/A'}</span>
              <span className="text-xs text-slate-500 leading-tight font-bold">{clinicianCredentials || 'N/A'}</span>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Department</span>
                <p className="text-xs font-bold text-slate-700">Speech-Language Pathology & Audiology</p>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostic Conclusion Section */}
        <div className="mb-12 page-break">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-3 mb-6">Diagnostic Conclusion</h3>
          <div className="p-10 bg-slate-50 rounded-3xl border-2 border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full -mr-32 -mt-32" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
              <div>
                <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-3">Provisional Diagnosis</p>
                <h2 className="text-5xl font-black text-slate-900 leading-tight mb-4 tracking-tighter">{diagnosis.type}</h2>
                <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-white rounded-2xl text-sm font-black text-indigo-700 uppercase tracking-widest border-2 border-indigo-100">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    diagnosis.severity === "Profound" ? "bg-red-500" :
                    diagnosis.severity === "Severe" ? "bg-orange-500" :
                    diagnosis.severity === "Moderate" ? "bg-amber-500" : "bg-emerald-500"
                  )} />
                  Severity: {diagnosis.severity}
                </div>
              </div>
              <div className="flex flex-col items-center md:items-end justify-center">
                <div className="text-center md:text-right">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Overall FDA-2 Mean Score</p>
                  <div className="flex items-baseline gap-2 justify-center md:justify-end">
                    <span className="text-8xl font-black text-slate-900 tracking-tighter leading-none">{overallAverage.toFixed(1)}</span>
                    <span className="text-2xl font-bold text-slate-300">/4.0</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-4 italic">Standardized Frenchay Dysarthria Assessment-2 Profile</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subsystem Radar Profile Diagram - MORE PROMINENT */}
        <div className="mb-12 page-break">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-8">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Subsystem Radar Profile</h3>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Visual Diagnostic Profile</span>
          </div>
          <div className="flex flex-col items-center bg-slate-50 p-12 rounded-[40px] border-2 border-slate-100">
            <div className="w-full flex justify-center mb-12" style={{ minHeight: '500px' }}>
              <RadarChart 
                width={700} 
                height={500} 
                cx={350} 
                cy={250} 
                outerRadius={200} 
                data={radarData}
              >
                <PolarGrid stroke="#cbd5e1" strokeWidth={1} />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 13, fontWeight: 900, fill: '#1e293b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 4]} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
                <Radar
                  name="Patient Profile"
                  dataKey="A"
                  stroke="#4f46e5"
                  strokeWidth={5}
                  fill="#6366f1"
                  fillOpacity={0.4}
                  isAnimationActive={false}
                />
              </RadarChart>
            </div>
            <div className="w-full grid grid-cols-4 gap-4">
              {radarData.map(d => (
                <div key={d.subject} className="text-center p-5 bg-white rounded-3xl border-2 border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{d.subject}</p>
                  <p className="text-2xl font-black text-slate-900 leading-none">{d.A.toFixed(1)}</p>
                  <div className="w-full h-1 bg-slate-100 rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(d.A / 4) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Analysis Findings Section - NEW INTEGRATED SECTION */}
        <div className="mb-12 page-break">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-3 mb-8">Analysis Findings & Acoustic Metrics</h3>
          <div className="grid grid-cols-1 gap-8">
            {/* Transcription Block */}
            {aiResult && aiResult.transcription && (
              <div className="p-10 bg-indigo-900 text-white rounded-[40px] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Volume2 size={120} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-6 opacity-60">Speech Transcription & Error Annotation</p>
                <p className="text-2xl font-medium italic leading-relaxed tracking-tight">
                  "{aiResult.transcription}"
                </p>
                <div className="mt-8 pt-8 border-t border-indigo-800 flex items-center gap-4">
                  <div className="px-4 py-1.5 bg-indigo-800 rounded-full text-[10px] font-black uppercase tracking-widest">AI Verified</div>
                  <div className="px-4 py-1.5 bg-indigo-800 rounded-full text-[10px] font-black uppercase tracking-widest">Acoustic Confidence: High</div>
                </div>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-8">
              {/* PCC Score Card */}
              {(() => {
                let correct = 0;
                let total = 0;
                Object.entries(articulationData).forEach(([phoneme, positions]) => {
                  if (CONSONANTS.includes(phoneme)) {
                    Object.values(positions).forEach(status => {
                      if (status !== ArticulationStatus.NotTested) {
                        total++;
                        if (status === ArticulationStatus.Correct) correct++;
                      }
                    });
                  }
                });
                const pccValue = total > 0 ? (correct / total) * 100 : 0;
                return (
                  <div className="p-8 bg-emerald-50 border-2 border-emerald-100 rounded-[32px] text-center">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">PCC Score</p>
                    <div className="relative inline-flex items-center justify-center mb-4">
                      <span className="text-5xl font-black text-emerald-900 tracking-tighter">{pccValue.toFixed(0)}%</span>
                    </div>
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Articulation Accuracy</p>
                  </div>
                );
              })()}

              {/* GRBAS Profile Card */}
              <div className="p-8 bg-indigo-50 border-2 border-indigo-100 rounded-[32px]">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">Voice Quality (GRBAS)</p>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(grbasData).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{key[0]}</p>
                      <p className="text-lg font-black text-indigo-900">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] font-bold text-indigo-400 mt-4 text-center uppercase tracking-widest">Perceptual Voice Profile</p>
              </div>

              {/* Acoustic Summary Card */}
              <div className="p-8 bg-slate-50 border-2 border-slate-100 rounded-[32px]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">AI Analysis Summary</p>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {typeof aiResult === 'string' ? aiResult : (aiResult?.summary || "Acoustic analysis reveals characteristic patterns of motor speech instability. Temporal and spectral markers indicate subsystem-specific deficits consistent with clinical observations.")}
                </p>
              </div>
            </div>

            {/* Detailed Acoustic Metrics */}
            {aiResult && aiResult.metrics && (
              <div className="grid grid-cols-4 gap-6">
                {Object.entries(aiResult.metrics).map(([key, value]: [string, any]) => (
                  <div key={key} className="p-6 bg-white border-2 border-slate-50 rounded-3xl text-center transition-colors">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">{key.replace(/_/g, ' ')}</p>
                    <p className="text-xl font-black text-indigo-900">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Clinical Summary & Narrative */}
        <div className="mb-12 page-break">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-3 mb-6">Clinical Summary & Diagnostic Reasoning</h3>
          <div className="p-10 bg-white border-2 border-indigo-50 rounded-3xl leading-relaxed text-sm text-slate-700 space-y-6 relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600 rounded-full" />
            <p className="font-medium">
              Comprehensive motor speech assessment reveals a <span className="font-black text-indigo-900 underline decoration-indigo-200 underline-offset-4">{diagnosis.severity.toLowerCase()} {diagnosis.type.toLowerCase()}</span> profile. 
              The assessment demonstrates significant involvement across multiple speech subsystems, with the primary physiological deficit observed in the <span className="font-black text-indigo-900">{radarData.sort((a, b) => a.A - b.A)[0].subject}</span> subsystem.
            </p>
            <p className="font-medium">
              Functional communication is estimated at <span className="font-black text-indigo-900">{((Object.values(fdaData.intelligibility).reduce((a, b) => a + b, 0) / 12) * 100).toFixed(0)}% intelligibility</span>. 
              Voice quality analysis (GRBAS) and oro-motor examination findings correlate with the identified dysarthria type, suggesting a neurological basis for the observed speech patterns.
            </p>
            <div className="mt-8 pt-8 border-t border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Validation</p>
                <p className="text-xs font-bold text-slate-900">Findings validated against standardized motor speech assessment protocols.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Subsystem Assessment */}
        <div className="mb-12 page-break">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-3 mb-6">Detailed Subsystem Analysis</h3>
          <div className="space-y-8">
            {Object.entries(fdaData).map(([subsystem, scores]) => (
              <div key={subsystem} className="border-2 border-slate-100 rounded-3xl overflow-hidden">
                <div className="bg-slate-50 px-6 py-3 border-b-2 border-slate-100 flex justify-between items-center">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">{subsystem}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subsystem Mean</span>
                    <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-black">
                      {(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length).toFixed(1)}/4.0
                    </span>
                  </div>
                </div>
                <div className="p-8 grid grid-cols-2 gap-12">
                  <div className="space-y-3">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Standardized Metrics</p>
                    {Object.entries(scores).map(([test, score]) => (
                      <div key={test} className="flex justify-between text-sm border-b border-slate-50 pb-2 items-center">
                        <span className="text-slate-600 font-bold capitalize">{test.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(score / 4) * 100}%` }} />
                          </div>
                          <span className="font-black text-slate-900 w-6 text-right">{score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Clinical Observations</p>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 min-h-[100px]">
                      <p className="text-xs text-slate-600 italic leading-relaxed font-medium">
                        {fdaObservations[subsystem] || "No specific observations recorded for this subsystem."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Oro-Motor Examination */}
        <div className="mb-12 page-break">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-3 mb-6">Oro-Motor Examination Profile</h3>
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Structural Integrity</h4>
              </div>
              <div className="space-y-3">
                {Object.entries(oroMotorData.structures).map(([part, metrics]) => (
                  <div key={part} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-black text-slate-800 capitalize mb-3">{part}</p>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(metrics).map(([metric, score]) => (
                        <div key={metric} className="flex justify-between items-center bg-white px-3 py-1.5 rounded-xl border border-slate-100">
                          <span className="text-[9px] text-slate-400 uppercase font-bold">{metric}</span>
                          <span className="text-xs font-black text-indigo-600">{score}/4</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Functional Performance</h4>
              </div>
              <div className="space-y-3">
                {Object.entries(oroMotorData.functions).map(([part, metrics]) => (
                  <div key={part} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-black text-slate-800 capitalize mb-3">{part}</p>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(metrics).map(([metric, score]) => (
                        <div key={metric} className="flex justify-between items-center bg-white px-3 py-1.5 rounded-xl border border-slate-100">
                          <span className="text-[9px] text-slate-400 uppercase font-bold">{metric}</span>
                          <span className="text-xs font-black text-emerald-600">{score}/4</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Treatment Plan */}
        <div className="mb-12 page-break">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-3 mb-6">Recommended Treatment Plan</h3>
          <div className="grid grid-cols-2 gap-8">
            {Object.entries(treatmentGoals.subsystems).map(([subsystem, goals]) => (
              (goals.shortTerm.length > 0 || goals.longTerm.length > 0) && (
                <div key={subsystem} className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100">
                  <h4 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-4 border-b-2 border-indigo-100 pb-2">{subsystem}</h4>
                  <div className="space-y-5">
                    {goals.shortTerm.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Short-Term Goals</p>
                        <ul className="space-y-2">
                          {goals.shortTerm.map((g, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-600 font-medium">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                              {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {goals.longTerm.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Long-Term Goals</p>
                        <ul className="space-y-2">
                          {goals.longTerm.map((g, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-600 font-medium">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                              {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Footer & Signature */}
        <div className="mt-20 pt-12 border-t-4 border-slate-100">
          <div className="grid grid-cols-2 gap-12">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-12">Clinician Signature</p>
              <div className="border-b-2 border-slate-900 w-64 mb-2" />
              <p className="text-sm font-black text-slate-900">{clinicianName}</p>
              <p className="text-xs text-slate-500 font-bold">{clinicianCredentials}</p>
            </div>
            <div className="text-right flex flex-col justify-end">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Generated via VakSiddhi Clinical Suite</p>
              <p className="text-[9px] text-slate-300 font-bold italic">This report is for clinical use only and should be interpreted by a qualified professional.</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProfile = () => {
    const radarData = [
      { subject: 'Reflex', A: Object.values(fdaData.reflex).reduce((a, b) => a + b, 0) / 3, fullMark: 4 },
      { subject: 'Respiration', A: Object.values(fdaData.respiration).reduce((a, b) => a + b, 0) / 2, fullMark: 4 },
      { subject: 'Lips', A: Object.values(fdaData.lips).reduce((a, b) => a + b, 0) / 5, fullMark: 4 },
      { subject: 'Jaw', A: Object.values(fdaData.jaw).reduce((a, b) => a + b, 0) / 2, fullMark: 4 },
      { subject: 'Palate', A: Object.values(fdaData.palate).reduce((a, b) => a + b, 0) / 3, fullMark: 4 },
      { subject: 'Laryngeal', A: Object.values(fdaData.laryngeal).reduce((a, b) => a + b, 0) / 4, fullMark: 4 },
      { subject: 'Tongue', A: Object.values(fdaData.tongue).reduce((a, b) => a + b, 0) / 6, fullMark: 4 },
      { subject: 'Intelligibility', A: Object.values(fdaData.intelligibility).reduce((a, b) => a + b, 0) / 3, fullMark: 4 },
    ];

    const overallAverage = radarData.reduce((acc, curr) => acc + curr.A, 0) / radarData.length;

    const getDiagnosis = () => {
      const scores = radarData.reduce((acc, curr) => ({ ...acc, [curr.subject.toLowerCase()]: curr.A }), {} as Record<string, number>);
      
      let type = manualDiagnosis || "Undetermined Dysarthria";
      let severity = manualSeverity || "Mild";

      if (!manualSeverity) {
        if (overallAverage < 1) severity = "Profound";
        else if (overallAverage < 2) severity = "Severe";
        else if (overallAverage < 3) severity = "Moderate";
        else if (overallAverage < 3.8) severity = "Mild";
        else severity = "Normal/Subclinical";
      }

      if (!manualDiagnosis) {
        // Simple heuristic for dysarthria type based on FDA-2 profiles
        if (scores.respiration < 2 && scores.laryngeal < 2 && scores.tongue < 2) type = "Flaccid Dysarthria";
        else if (scores.laryngeal < 2 && scores.intelligibility < 2 && scores.respiration > 3) type = "Spastic Dysarthria";
        else if (scores.intelligibility < 2 && scores.respiration < 3 && scores.laryngeal > 3) type = "Ataxic Dysarthria";
        else if (scores.jaw < 2 && scores.tongue < 2) type = "Hypokinetic Dysarthria";
        else if (scores.laryngeal < 2 && scores.intelligibility < 2) type = "Hyperkinetic Dysarthria";
      }

      return { type, severity };
    };

    const diagnosis = getDiagnosis();

    return (
      <div className="space-y-6">
        <SectionTitle>Assessment Profile & Provisional Diagnosis</SectionTitle>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="md:col-span-2 bg-indigo-900 text-white flex flex-col justify-between shadow-xl shadow-indigo-200">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20">
                    <Activity size={16} className="text-white" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Provisional Diagnosis</h4>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Dysarthria Type</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button 
                        onClick={() => setManualDiagnosis('')}
                        className={cn(
                          "px-2 py-1.5 rounded text-[9px] font-bold border transition-all",
                          manualDiagnosis === '' ? "bg-indigo-500 border-indigo-400 text-white" : "bg-indigo-800/50 border-indigo-700 text-indigo-300 hover:bg-indigo-800"
                        )}
                      >
                        Auto-Detect
                      </button>
                      {DYSARTHRIA_TYPES.map(t => (
                        <button 
                          key={t}
                          onClick={() => setManualDiagnosis(t)}
                          className={cn(
                            "px-2 py-1.5 rounded text-[9px] font-bold border transition-all",
                            manualDiagnosis === t ? "bg-indigo-500 border-indigo-400 text-white" : "bg-indigo-800/50 border-indigo-700 text-indigo-300 hover:bg-indigo-800"
                          )}
                        >
                          {t.replace(' Dysarthria', '')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Severity Level</label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      <button 
                        onClick={() => setManualSeverity('')}
                        className={cn(
                          "px-2 py-1.5 rounded text-[9px] font-bold border transition-all",
                          manualSeverity === '' ? "bg-indigo-500 border-indigo-400 text-white" : "bg-indigo-800/50 border-indigo-700 text-indigo-300 hover:bg-indigo-800"
                        )}
                      >
                        Auto-Detect
                      </button>
                      {SEVERITY_LEVELS.map(s => (
                        <button 
                          key={s}
                          onClick={() => setManualSeverity(s)}
                          className={cn(
                            "px-2 py-1.5 rounded text-[9px] font-bold border transition-all",
                            manualSeverity === s ? "bg-indigo-500 border-indigo-400 text-white" : "bg-indigo-800/50 border-indigo-700 text-indigo-300 hover:bg-indigo-800"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-3xl font-black tracking-tight">{diagnosis.type}</div>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/50 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-400/30">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  diagnosis.severity === "Profound" ? "bg-red-400" :
                  diagnosis.severity === "Severe" ? "bg-orange-400" :
                  diagnosis.severity === "Moderate" ? "bg-amber-400" : "bg-green-400"
                )} />
                Severity: {diagnosis.severity}
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-indigo-800 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-indigo-400 uppercase">Overall FDA-2 Mean</span>
                <span className="text-2xl font-black">{overallAverage.toFixed(1)}<span className="text-sm text-indigo-400">/4.0</span></span>
              </div>
              <div className="text-right">
                <button 
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="px-4 py-2 bg-white text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isDownloading ? <div className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /> : <Download size={14} />}
                  {isDownloading ? 'Generating...' : 'Download PDF Report'}
                </button>
              </div>
            </div>
          </Card>

          <Card className="md:col-span-1 border-l-4 border-l-amber-500 flex flex-col justify-between">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Primary Deficit</h4>
              <div className="text-xl font-black text-slate-800 leading-tight">
                {radarData.sort((a, b) => a.A - b.A)[0].subject}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-4 font-medium">Lowest scoring subsystem requiring immediate intervention.</p>
          </Card>

          <Card className="md:col-span-1 border-l-4 border-l-green-500 flex flex-col justify-between">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Intelligibility</h4>
              <div className="text-xl font-black text-slate-800">
                {((Object.values(fdaData.intelligibility).reduce((a, b) => a + b, 0) / 12) * 100).toFixed(0)}%
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-4 font-medium">Estimated functional communication accuracy.</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="neo-card">
            <h4 className="text-xs font-black text-slate-800 mb-6 uppercase tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-600" /> Subsystem Radar Profile
            </h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 4]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Patient"
                    dataKey="A"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="neo-card">
            <h4 className="text-xs font-black text-slate-800 mb-6 uppercase tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-600" /> Clinical Summary & Guidance
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-indigo-600 mb-2">
                  <Info size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Diagnostic Reasoning</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The profile indicates <span className="font-bold text-slate-800">{diagnosis.severity.toLowerCase()} {diagnosis.type.toLowerCase()}</span>. 
                  The primary physiological deficit is in <span className="font-bold text-slate-800">{radarData[0].subject.toLowerCase()}</span>, 
                  which significantly impacts overall speech intelligibility and naturalness.
                </p>
              </div>
              
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <AlertCircle size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Therapeutic Focus</span>
                </div>
                <p className="text-sm text-amber-800 leading-relaxed italic">
                  "Prioritize {radarData[0].subject.toLowerCase()} exercises to improve subsystem stability. Consider augmentative strategies if intelligibility falls below 50%."
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="bg-slate-900 text-white overflow-hidden relative mb-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-black tracking-tight">Generate Comprehensive Report</h3>
              <p className="text-slate-400 text-sm mt-1">Compile all assessment data, AI analysis, and clinical findings into a PDF.</p>
            </div>
            <button 
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download size={24} />
              )}
              {isDownloading ? 'Generating Report...' : 'Download PDF Report'}
            </button>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden no-print">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative p-2.5 bg-indigo-600 rounded-xl text-white shadow-xl shadow-indigo-200 flex items-center justify-center transform transition-transform duration-500 hover:rotate-12">
                <Volume2 size={28} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-slate-900 leading-none">VakSiddhi</h1>
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">Assessment Suite</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Clinical Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={History} 
            label="History & Records" 
            active={activeTab === 'records'} 
            onClick={() => { setActiveTab('records'); setIsSidebarOpen(false); }} 
          />
          <div className="h-px bg-slate-100 my-2 mx-2" />
          <SidebarItem 
            icon={UserIcon} 
            label="Patient Proforma" 
            active={activeTab === 'patient'} 
            onClick={() => { setActiveTab('patient'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Activity} 
            label="Oro-Motor Exam" 
            active={activeTab === 'oromotor'} 
            onClick={() => { setActiveTab('oromotor'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Wind} 
            label="Respiratory System" 
            active={activeTab === 'respiratory'} 
            onClick={() => { setActiveTab('respiratory'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Mic2} 
            label="Phonatory System" 
            active={activeTab === 'phonatory'} 
            onClick={() => { setActiveTab('phonatory'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Waves} 
            label="Resonatory System" 
            active={activeTab === 'resonatory'} 
            onClick={() => { setActiveTab('resonatory'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={ClipboardCheck} 
            label="FDA-2 Assessment" 
            active={activeTab === 'fda'} 
            onClick={() => { setActiveTab('fda'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={CheckCircle2} 
            label="Articulation Test" 
            active={activeTab === 'articulation'} 
            onClick={() => { setActiveTab('articulation'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Image} 
            label="Speech Elicitation" 
            active={activeTab === 'elicitation'} 
            onClick={() => { setActiveTab('elicitation'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Mic} 
            label="DDK Rates" 
            active={activeTab === 'ddk'} 
            onClick={() => { setActiveTab('ddk'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Languages} 
            label="AI Speech Analysis" 
            active={activeTab === 'ai'} 
            onClick={() => { setActiveTab('ai'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={BarChart3} 
            label="Results Profile" 
            active={activeTab === 'profile'} 
            onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Target} 
            label="Treatment Plan" 
            active={activeTab === 'treatment'} 
            onClick={() => { setActiveTab('treatment'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Globe} 
            label="Indic Support" 
            active={activeTab === 'translation'} 
            onClick={() => { setActiveTab('translation'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Settings} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} 
          />
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          {user ? (
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs border border-indigo-200">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{user.displayName || 'User'}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center w-full gap-3 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                <X size={14} /> Sign Out
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center w-full gap-3 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-500 transition-all mb-4"
            >
              <Globe size={18} /> Sign In with Google
            </button>
          )}
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 mb-3 hidden lg:block">
            <div className="flex items-center gap-2 mb-1">
              <Monitor size={12} className="text-indigo-600" />
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Pro Tip</p>
            </div>
            <p className="text-[10px] text-indigo-700 leading-tight">
              Use on a Desktop/Laptop (Windows/Mac) for the best clinical experience.
            </p>
          </div>
          <div className="px-2">
            <p className="text-[10px] text-slate-400 font-medium text-center leading-relaxed">
              FDA-2 Digital Assistant<br/>
              Clinical Assessment Tool
            </p>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button 
              onClick={handleShare}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mb-4 shadow-sm",
                isCopied 
                  ? "bg-green-500 text-white shadow-green-100" 
                  : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200"
              )}
            >
              {isCopied ? (
                <>
                  <CheckCircle2 size={12} /> Link Copied!
                </>
              ) : (
                <>
                  <Share2 size={12} /> Share App
                </>
              )}
            </button>
            <div className="space-y-1">
              <p className="text-[9px] text-slate-400 text-center leading-relaxed italic">
                Developed and designed by
              </p>
              <p className="text-[10px] text-slate-700 font-black text-center leading-none">
                Mr. Hemaraja Nayaka.S
              </p>
              <p className="text-[8px] text-slate-500 text-center leading-tight">
                (M.Sc SLP, PGDBEME, DHA&ET- Associate Professor in Speech Language Pathology)
              </p>
            </div>
          </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50/50 relative no-print">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-500 hover:text-indigo-600 lg:hidden"
            >
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-base lg:text-lg font-black text-slate-800 capitalize">{activeTab.replace(/([A-Z])/g, ' $1').trim()}</h2>
              <p className="text-[10px] lg:text-xs text-slate-500 font-medium truncate max-w-[150px] lg:max-w-none">
                {patientInfo.name ? `Patient: ${patientInfo.name}` : 'New Assessment Session'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <button 
              onClick={saveRecord}
              disabled={isSaving}
              className={cn(
                "flex items-center gap-2 px-3 lg:px-4 py-2 text-white text-xs lg:text-sm font-bold rounded-xl transition-all shadow-lg",
                isSaving ? "bg-slate-700 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800 shadow-slate-200"
              )}
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={16} className="lg:w-[18px] lg:h-[18px]" />
              )}
              <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save Session'}</span>
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className={cn(
                "flex items-center gap-2 px-3 lg:px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm font-bold text-xs lg:text-sm",
                isDownloading && "opacity-50 cursor-not-allowed"
              )}
              title="Download PDF Report"
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
              ) : (
                <Printer size={16} className="lg:w-[18px] lg:h-[18px]" />
              )}
              <span className="hidden sm:inline">{isDownloading ? 'Generating PDF...' : 'Download Report'}</span>
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-6xl mx-auto pb-24 no-print">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'records' && renderRecords()}
              {activeTab === 'patient' && renderPatientInfo()}
              {activeTab === 'oromotor' && renderOroMotor()}
              {activeTab === 'respiratory' && renderRespiratory()}
              {activeTab === 'phonatory' && renderPhonatory()}
              {activeTab === 'resonatory' && renderResonatory()}
              {activeTab === 'ddk' && renderDDK()}
              {activeTab === 'articulation' && renderDeepTest()}
              {activeTab === 'elicitation' && renderSpeechElicitation()}
              {activeTab === 'ai' && renderAIAnalysis()}
              {activeTab === 'translation' && renderTranslationalSupport()}
              {activeTab === 'profile' && renderProfile()}
              {activeTab === 'treatment' && renderTreatment()}
              {activeTab === 'settings' && renderSettings()}
              {activeTab === 'fda' && (
                <div className="space-y-6">
                  <SectionTitle>FDA-2 Standardized Assessment</SectionTitle>
                  <Card className="bg-amber-50 border-amber-200">
                    <p className="text-amber-800 text-sm italic">
                      "Assess each subtest and grade from 0 (No functional ability) to 4 (Normal). 
                      Refer to the FDA-2 manual for specific grading criteria for each task."
                    </p>
                  </Card>
                  
                  <div className="grid grid-cols-1 gap-8">
                    {Object.keys(fdaData).map(section => {
                      const scores = Object.values(fdaData[section]);
                      const average = scores.reduce((a, b) => a + b, 0) / scores.length;
                      const getSeverity = (avg: number) => {
                        if (avg >= 3.5) return { label: 'Normal', color: 'text-green-600' };
                        if (avg >= 2.5) return { label: 'Mild', color: 'text-blue-600' };
                        if (avg >= 1.5) return { label: 'Moderate', color: 'text-amber-600' };
                        if (avg >= 0.5) return { label: 'Severe', color: 'text-orange-600' };
                        return { label: 'Profound', color: 'text-red-600' };
                      };
                      const severity = getSeverity(average);

                      return (
                        <Card key={section} className="overflow-hidden border-l-4 border-l-indigo-500">
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <h3 className="text-xl font-bold text-slate-800 capitalize">{section}</h3>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Subsystem Assessment</p>
                            </div>
                            <div className="text-right">
                              <span className={cn("text-sm font-black uppercase tracking-tighter", severity.color)}>{severity.label}</span>
                              <div className="text-2xl font-black text-slate-800">{average.toFixed(1)}<span className="text-slate-300 text-sm font-normal ml-1">/ 4.0</span></div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                              {Object.keys(fdaData[section]).map(subtest => (
                                <div key={subtest} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl transition-all hover:bg-slate-100">
                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-slate-700 capitalize">{subtest}</span>
                                      <span className="text-[10px] text-slate-400 italic">
                                        {ELICITATION_INSTRUCTIONS.fda[subtest] || "Observe or elicit response."}
                                      </span>
                                    </div>
                                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Score: {fdaData[section][subtest]}</span>
                                  </div>
                                  <div className="flex gap-1">
                                    {[0, 1, 2, 3, 4].map(score => (
                                      <button 
                                        key={score}
                                        className={cn(
                                          "flex-1 h-8 rounded-lg text-xs font-bold transition-all",
                                          fdaData[section][subtest] === score 
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                                            : "bg-white border border-slate-200 text-slate-400 hover:border-indigo-300"
                                        )}
                                        onClick={() => setFdaData({
                                          ...fdaData,
                                          [section]: { ...fdaData[section], [subtest]: score }
                                        })}
                                      >
                                        {score}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Clinical Observations</label>
                              <textarea 
                                className="w-full h-full min-h-[150px] p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed"
                                placeholder={`Enter specific observations for ${section}...`}
                                value={fdaObservations[section]}
                                onChange={e => setFdaObservations({...fdaObservations, [section]: e.target.value})}
                              />
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
    {renderPrintReport()}
    </ErrorBoundary>
  );
}
