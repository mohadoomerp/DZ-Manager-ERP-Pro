
import { SalaryRubrique } from '../../types';

// Bibliothèque inspirée de la nomenclature SONELGAZ / Secteur Économique
export const COMMON_RUBRIQUES: SalaryRubrique[] = [
  // --- LIÉS AU POSTE (COTISABLES & IMPOSABLES) ---
  { id: 'IEP', label: "I.E.P (Expérience Professionnelle)", value: 0, isCotisable: true, isImposable: true, type: 'fixed' },
  { id: 'ISP', label: "I.S.P (Service Permanent)", value: 0, isCotisable: true, isImposable: true, type: 'fixed' },
  { id: 'NUIS', label: "Indemnité de Nuisance", value: 0, isCotisable: true, isImposable: true, type: 'fixed' },
  { id: 'DANGER', label: "Indemnité de Danger", value: 0, isCotisable: true, isImposable: true, type: 'fixed' },
  { id: 'ZONE', label: "Indemnité de Zone / Sud", value: 0, isCotisable: true, isImposable: true, type: 'fixed' },
  { id: 'RESP', label: "Indemnité de Responsabilité", value: 0, isCotisable: true, isImposable: true, type: 'fixed' },
  { id: 'QUART', label: "Indemnité de Travail Posté (3x8)", value: 0, isCotisable: true, isImposable: true, type: 'variable' },
  { id: 'ASTR', label: "Indemnité d'Astreinte", value: 0, isCotisable: true, isImposable: true, type: 'variable' },
  
  // --- RENDEMENT (COTISABLES & IMPOSABLES) ---
  { id: 'PRI', label: "P.R.I (Rendement Individuel)", value: 0, isCotisable: true, isImposable: true, type: 'variable' },
  { id: 'PRC', label: "P.R.C (Rendement Collectif)", value: 0, isCotisable: true, isImposable: true, type: 'variable' },
  { id: 'HS50', label: "Heures Supp. 50%", value: 0, isCotisable: true, isImposable: true, type: 'variable' },
  { id: 'HS75', label: "Heures Supp. 75%", value: 0, isCotisable: true, isImposable: true, type: 'variable' },
  { id: 'HS100', label: "Heures Supp. 100% (WE/Férié)", value: 0, isCotisable: true, isImposable: true, type: 'variable' },

  // --- CARACTÈRE SOCIAL / FRAIS (NON COTISABLES) ---
  { id: 'PANIER', label: "Indemnité de Panier", value: 0, isCotisable: false, isImposable: false, type: 'fixed' }, // Souvent exonéré
  { id: 'TRANSPORT', label: "Indemnité de Transport", value: 0, isCotisable: false, isImposable: false, type: 'fixed' }, // Souvent exonéré
  { id: 'VEHICULE', label: "Indemnité Véhicule (Util. Perso)", value: 0, isCotisable: false, isImposable: true, type: 'fixed' },
  { id: 'IFL', label: "I.F.L (Frais Logement)", value: 0, isCotisable: false, isImposable: true, type: 'fixed' },
  { id: 'IEC', label: "I.E.C (Electricité/Gaz)", value: 0, isCotisable: false, isImposable: true, type: 'fixed' },
  { id: 'MISSION', label: "Frais de Mission", value: 0, isCotisable: false, isImposable: false, type: 'variable' },
  { id: 'PHONE', label: "Frais Téléphonique", value: 0, isCotisable: false, isImposable: true, type: 'fixed' },

  // --- PRIMES ANNUELLES / EXCEPTIONNELLES ---
  { id: 'BILAN', label: "Prime de Bilan", value: 0, isCotisable: true, isImposable: true, type: 'variable' },
  { id: 'SCO', label: "Prime de Scolarité", value: 0, isCotisable: true, isImposable: true, type: 'fixed' },
  
  // --- RETENUES ---
  { id: 'ACOMPTE', label: "Acompte sur Salaire", value: 0, isCotisable: false, isImposable: false, type: 'variable' },
  { id: 'RET_ABS', label: "Retenue Absences (Manuelle)", value: 0, isCotisable: true, isImposable: true, type: 'variable' },
  { id: 'PRET', label: "Remboursement Prêt Social", value: 0, isCotisable: false, isImposable: false, type: 'variable' },
];

export const RECRUITMENT_STAGES = [
  { id: 'New', label: 'Candidature', color: 'bg-blue-100 text-blue-700' },
  { id: 'Screening', label: 'En Examen', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'Interview', label: 'Entretien', color: 'bg-amber-100 text-amber-700' },
  { id: 'Offer', label: 'Offre', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'Rejected', label: 'Rejeté', color: 'bg-rose-100 text-rose-700' }
];
