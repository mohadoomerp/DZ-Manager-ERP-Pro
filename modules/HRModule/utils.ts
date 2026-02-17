
import { Employee, AttendanceRecord, CompanySettings } from '../../types';
import { formatCurrency } from '../../constants';

export const calculatePayrollData = (emp: Employee, attendance: AttendanceRecord[], currentDate: string, settings?: CompanySettings) => {
    if (!emp) return { salairePoste: 0, gainsTotaux: 0, cnas: 0, irg: 0, net: 0, realBonus: 0, hasPenalty: false, jourAbsents: 0, baseImposable: 0, primesNet: 0, retenuesPrets: 0, montantRetenueAbsence: 0, tauxJournalier: 0, salaireBaseReel: 0 };
    
    // --- PARAMÈTRES GLOBAUX ---
    const JOURS_BASE = settings?.workingDaysCount || 30; // Standard 30 jours calendaires
    const HEURES_BASE = settings?.hourlyBase || 173.33; // Standard 40h/semaine
    const TAUX_CNAS = 0.09;

    const base = Number(emp.baseSalary) || 0;
    const rubriques = Array.isArray(emp.rubriques) ? emp.rubriques : [];
    const bonusMax = Number(emp.presenceBonus) || 0;
    
    const isCotisable = emp.isSociallyInsured !== undefined ? emp.isSociallyInsured : true;
    const isImposable = emp.isTaxable !== undefined ? emp.isTaxable : true;

    // --- CALCUL TAUX HORAIRE (Pour HS et Retards) ---
    const iep = rubriques.find(r => r.id === 'IEP')?.value || 0;
    const nuisance = rubriques.find(r => r.id === 'NUIS')?.value || 0;
    const danger = rubriques.find(r => r.id === 'DANGER')?.value || 0;
    const baseCalculTaux = base + iep + nuisance + danger; 
    const tauxHoraire = baseCalculTaux / HEURES_BASE;

    // --- GESTION HEURES SUPPLÉMENTAIRES ---
    const hs50_hours = rubriques.find(r => r.id === 'HS50')?.value || 0;
    const hs75_hours = rubriques.find(r => r.id === 'HS75')?.value || 0;
    const hs100_hours = rubriques.find(r => r.id === 'HS100')?.value || 0;

    const montantHS50 = hs50_hours * tauxHoraire * 1.5;
    const montantHS75 = hs75_hours * tauxHoraire * 1.75;
    const montantHS100 = hs100_hours * tauxHoraire * 2.0;
    
    const totalPrimesHS = montantHS50 + montantHS75 + montantHS100;

    // --- GESTION DES ABSENCES ---
    const currentMonth = (currentDate || "").substring(0, 7);
    const empAttendance = (Array.isArray(attendance) ? attendance : []).filter(a => a && a.employeeId === emp.id && a.date && a.date.startsWith(currentMonth));
    
    const absentDays = empAttendance.filter(a => a.status === 'Absent').length;
    
    // Taux journalier pour déduction (Base / 30 ou 22)
    const tauxJournalierBase = base / JOURS_BASE;
    const retenueAbsence = absentDays * tauxJournalierBase;
    
    // Salaire de Base Réel (après déduction absence)
    const salaireBaseReel = Math.max(0, base - retenueAbsence);

    const hasPenalty = absentDays > 0 || empAttendance.some(a => a.status === 'Late');
    const realBonus = hasPenalty ? 0 : bonusMax; 

    // 1. CALCUL DU SALAIRE DE POSTE (Base Cotisable)
    const primesCotisablesClassiques = rubriques
        .filter(r => !['HS50', 'HS75', 'HS100'].includes(r.id))
        .reduce((acc, r) => r && r.isCotisable ? acc + (Number(r.value) || 0) : acc, 0);
    
    const salairePoste = salaireBaseReel + primesCotisablesClassiques + totalPrimesHS + realBonus;
    
    // 2. CALCUL RETENUE S.S (CNAS)
    const cnas = isCotisable ? (Math.round(salairePoste * TAUX_CNAS * 100) / 100) : 0;

    // 3. CALCUL ASSIETTE IMPOSABLE (IRG)
    const primesNonCotisablesImposables = rubriques.reduce((acc, r) => r && !r.isCotisable && r.isImposable ? acc + (Number(r.value) || 0) : acc, 0);
    
    let baseImposable = 0;
    if (isCotisable) {
        baseImposable = (salairePoste - cnas) + primesNonCotisablesImposables;
    } else {
        baseImposable = salairePoste + primesNonCotisablesImposables;
    }
    
    const baseImposableArrondie = Math.floor(baseImposable / 10) * 10;

    // 4. CALCUL IRG (BARÈME 2020)
    let irg = 0;
    if (isImposable && baseImposableArrondie > 30000) {
        let irgBrut = 0;

        if (baseImposableArrondie <= 30000) {
            irgBrut = 0;
        } else if (baseImposableArrondie <= 35000) {
            irgBrut = (baseImposableArrondie - 30000) * 8 / 3;
        } else {
            let reste = baseImposableArrondie;
            if (reste > 30000) irgBrut += 4000;
            if (reste > 30000) {
                const montantTranche = Math.min(reste, 120000) - 30000;
                irgBrut += montantTranche * 0.30;
            }
            if (reste > 120000) {
                const montantTranche = reste - 120000;
                irgBrut += montantTranche * 0.35;
            }
        }

        let abattement = irgBrut * 0.40;
        if (abattement < 1000) abattement = 1000;
        if (abattement > 1500) abattement = 1500;
        
        irg = Math.max(0, irgBrut - abattement);

        if (baseImposableArrondie > 30000 && baseImposableArrondie < 35000) {
             irg = (baseImposableArrondie - 30000) * 0.5;
        }
    } else if (baseImposableArrondie <= 30000) {
        irg = 0;
    }
    
    irg = Math.floor(irg);

    // 5. TOTAL GAINS & RETENUES
    const primesNet = rubriques.reduce((acc, r) => r && !r.isCotisable && !r.isImposable ? acc + (Number(r.value) || 0) : acc, 0);
    
    const retenuesPrets = (emp.loans || [])
        .filter(l => l.status === 'Approved')
        .reduce((acc, l) => acc + (l.monthlyPayment || 0), 0);
        
    const autresRetenues = rubriques.filter(r => ['ACOMPTE', 'RET_ABS'].includes(r.id)).reduce((acc, r) => acc + (Number(r.value) || 0), 0);

    const totalRetenues = cnas + irg + retenuesPrets + autresRetenues;
    const totalBrut = salairePoste + primesNonCotisablesImposables + primesNet + retenueAbsence;

    // 6. NET A PAYER
    const netAPayer = salairePoste + primesNonCotisablesImposables + primesNet - totalRetenues;

    return { 
        salairePoste, 
        gainsTotaux: totalBrut, 
        cnas, 
        irg, 
        net: netAPayer, 
        realBonus, 
        hasPenalty, 
        jourAbsents: absentDays,
        salaireBaseReel,
        baseImposable,
        primesNet,
        retenuesPrets,
        montantRetenueAbsence: retenueAbsence,
        tauxJournalier: tauxJournalierBase
    };
};

export const generateEmargementHtml = (employees: Employee[], attendance: AttendanceRecord[], monthStr: string, company: CompanySettings) => {
    const [year, month] = monthStr.split('-');
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const monthLabel = new Date(parseInt(year), parseInt(month)-1).toLocaleDateString('fr-DZ', { month: 'long', year: 'numeric' });

    let tableHeader = `<th style="width: 150px;">Employé</th>`;
    days.forEach(d => {
        tableHeader += `<th style="width: 25px; font-size: 8px;">${d}</th>`;
    });
    tableHeader += `<th>ABS</th><th>OBS</th>`;

    let rows = '';
    employees.forEach(emp => {
        const empRecords = attendance.filter(a => a.employeeId === emp.id && a.date.startsWith(monthStr));
        let cells = '';
        let totalAbs = 0;

        days.forEach(d => {
            const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
            const record = empRecords.find(a => a.date === dateStr);
            const dateObj = new Date(parseInt(year), parseInt(month)-1, d);
            const isWE = dateObj.getDay() === 5 || dateObj.getDay() === 6;

            let content = '';
            let style = '';

            if (isWE) {
                style = 'background-color: #f0f0f0;';
                content = 'R';
            } else if (record) {
                if (record.status === 'Present') { content = 'P'; }
                else if (record.status === 'Absent') { content = 'A'; style = 'background-color: #ffebee; color: red; font-weight:bold;'; totalAbs++; }
                else if (record.status === 'Late') { content = 'R'; style = 'color: orange;'; }
                else if (record.status === 'Leave') { content = 'C'; style = 'background-color: #e3f2fd;'; }
            }

            cells += `<td style="text-align: center; border: 1px solid #000; font-size: 9px; ${style}">${content}</td>`;
        });

        rows += `
            <tr>
                <td style="border: 1px solid #000; padding: 2px 5px; font-weight: bold;">${emp.name}</td>
                ${cells}
                <td style="border: 1px solid #000; text-align: center; font-weight: bold;">${totalAbs}</td>
                <td style="border: 1px solid #000;"></td>
            </tr>
        `;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>État d'Émargement - ${monthLabel}</title>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 20px; font-size: 10px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .title { text-align: center; font-size: 18px; font-weight: bold; text-transform: uppercase; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { border: 1px solid #000; background-color: #e0e0e0; padding: 4px; text-transform: uppercase; }
          @page { size: A4 landscape; margin: 1cm; }
        </style>
      </head>
      <body>
         <div class="header">
            <div><strong>${company.name}</strong><br/>${company.address}</div>
            <div style="text-align: right;">Exercice : ${year}<br/>Mois : ${monthLabel}</div>
         </div>
         <div class="title">FEUILLE DE PRÉSENCE MENSUELLE (POINTAGE)</div>
         <table><thead><tr>${tableHeader}</tr></thead><tbody>${rows}</tbody></table>
         <div style="margin-top: 30px; display: flex; justify-content: space-between;">
            <div><p><strong>Légende :</strong></p><p>P : Présent | A : Absent | R : Retard | C : Congé | R : Repos</p></div>
            <div style="text-align: center; width: 200px;"><p><strong>Le Responsable RH</strong></p><br/><br/><p>(Signature)</p></div>
         </div>
      </body>
      </html>
    `;
};

export const generateDocumentHtml = (type: 'Attestation' | 'Conge' | 'Avertissement' | 'ATS' | 'Certificat', emp: Employee, company: CompanySettings, extraData?: any) => {
    const today = new Date().toLocaleDateString('fr-DZ', { year: 'numeric', month: 'long', day: 'numeric' });
    let docTitle = "";
    let docBody = "";

    if (type === 'Attestation' || type === 'Certificat') {
        docTitle = type === 'Attestation' ? "ATTESTATION DE TRAVAIL" : "CERTIFICAT DE TRAVAIL";
        const isExit = emp.status === 'Archived' || (extraData && extraData.exitDate);
        const exitDateStr = extraData?.exitDate ? new Date(extraData.exitDate).toLocaleDateString('fr-DZ') : (emp.exitDate ? new Date(emp.exitDate).toLocaleDateString('fr-DZ') : null);
        
        const fin = isExit && exitDateStr
            ? `et a quitté l'établissement le ${exitDateStr}`
            : `et occupe cet emploi à ce jour`;
        
        const mentionLibre = type === 'Certificat' && isExit ? "<p>Nous certifions également que l'intéressé(e) est libre de tout engagement.</p>" : "";

        docBody = `
          <p>Nous soussignés, <strong>${company.name}</strong>, attestons par la présente que :</p>
          <div style="margin: 30px 0; padding-left: 20px;">
              <p>M./Mme : <strong>${emp.name}</strong></p>
              <p>Né(e) le : ${new Date(emp.dateOfBirth).toLocaleDateString('fr-DZ')} à ${emp.placeOfBirth}</p>
          </div>
          <p>Est employé(e) au sein de notre organisme en qualité de <strong>${emp.position}</strong> du ${new Date(emp.joinDate).toLocaleDateString('fr-DZ')} ${fin}.</p>
          ${mentionLibre}
          <p style="margin-top: 30px;">Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.</p>
        `;
    } else if (type === 'Conge') {
        docTitle = "TITRE DE CONGÉ";
        docBody = `
          <p>La Direction de <strong>${company.name}</strong> autorise :</p>
          <div style="margin: 30px 0; padding-left: 20px;">
              <p>M./Mme : <strong>${emp.name}</strong></p>
              <p>Fonction : ${emp.position}</p>
          </div>
          <p>À s'absenter pour un congé annuel du <strong>${extraData?.startStr || '...'}</strong> au <strong>${extraData?.endStr || '...'}</strong> inclus.</p>
          <p>L'intéressé(e) devra reprendre son poste le jour ouvrable suivant la date de fin.</p>
        `;
    } else if (type === 'Avertissement') {
        docTitle = "AVERTISSEMENT";
        docBody = `
          <p>À l'attention de M./Mme <strong>${emp.name}</strong>,</p>
          <p>Nous avons le regret de vous notifier par la présente un avertissement pour le motif suivant :</p>
          <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-left: 4px solid #000;">
              <strong>${extraData?.motif || 'Non respect du règlement intérieur'}</strong>
          </div>
          <p>Nous vous demandons de bien vouloir redresser cette situation.</p>
        `;
    } else if (type === 'ATS') {
        docTitle = "ATTESTATION DE TRAVAIL ET DE SALAIRE";
        docBody = `
          <p>Document destiné à la Caisse Nationale des Assurances Sociales (CNAS).</p>
          <p>L'employeur <strong>${company.name}</strong> certifie que M./Mme <strong>${emp.name}</strong> (N° SS: ${emp.cnasNumber || 'N/A'}) est salarié déclaré.</p>
          <p>Période de travail : Du ${new Date(emp.joinDate).toLocaleDateString('fr-DZ')} à ce jour.</p>
          <p>Salaire de poste actuel : <strong>${formatCurrency(emp.baseSalary)}</strong></p>
        `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${docTitle}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
          body { font-family: 'Roboto', sans-serif; padding: 40px; color: #000; line-height: 1.6; max-width: 21cm; margin: 0 auto; }
          .header { border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-start; }
          .company-details { font-size: 11px; text-align: left; }
          .company-details strong { font-size: 16px; text-transform: uppercase; }
          .logo-container { text-align: right; }
          .logo-container img { max-height: 80px; max-width: 150px; object-fit: contain; }
          .republic { text-align: center; font-size: 10px; text-transform: uppercase; font-weight: bold; margin-bottom: 20px; color: #555; }
          .doc-title { text-align: center; font-size: 24px; font-weight: 900; text-transform: uppercase; text-decoration: underline; margin: 40px 0; letter-spacing: 2px; }
          .content { font-size: 14px; text-align: justify; min-height: 300px; }
          .footer { margin-top: 80px; display: flex; justify-content: space-between; }
          .signature-box { width: 200px; text-align: center; }
          .legal-footer { border-top: 1px solid #ccc; margin-top: 50px; pt: 10px; font-size: 9px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="republic">République Algérienne Démocratique et Populaire</div>
        
        <div class="header">
          <div class="company-details">
             <strong>${company.name}</strong><br/>
             ${company.address}<br/>
             ${company.commune}, ${company.wilaya}<br/>
             <span style="font-family: monospace;">RC: ${company.rc} | NIF: ${company.nif}</span>
          </div>
          <div class="logo-container">
             ${company.logoUrl ? `<img src="${company.logoUrl}" />` : `<div style="font-size: 30px; font-weight: bold; border: 2px solid #000; padding: 10px;">${company.name.charAt(0)}</div>`}
          </div>
        </div>

        <div class="doc-title">${docTitle}</div>

        <div class="content">
           ${docBody}
        </div>

        <div class="footer">
           <div class="signature-box">
              <p>L'Employé(e)</p>
           </div>
           <div class="signature-box">
              <p>Fait à ${company.wilaya}, le ${today}</p>
              <p><strong>La Direction</strong></p>
              <br/><br/>
              <p style="font-size: 10px;">(Cachet et Signature)</p>
           </div>
        </div>

        <div class="legal-footer">
           ${company.name} - ${company.legalForm}
        </div>
      </body>
      </html>
    `;
};
