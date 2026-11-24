import React from 'react';
import type { LessonDiagramSpec } from '../types/curriculum';

interface LessonDiagramProps {
  diagram: LessonDiagramSpec;
}

export function LessonDiagram({ diagram }: LessonDiagramProps) {
  const [imgError, setImgError] = React.useState(false);

  const renderSvgSchematic = () => {
    switch (diagram.svgKind) {
      case 'gravity_orbit':
        return (
          <svg viewBox="0 0 420 200" className="w-full max-w-md h-auto" role="img" aria-label={diagram.titleAr}>
            <ellipse cx="210" cy="100" rx="140" ry="68" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeDasharray="5 4" strokeWidth="2" />
            <circle cx="210" cy="100" r="28" className="fill-sky-700 dark:fill-sky-500" />
            <text x="210" y="104" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">M</text>
            <circle cx="332" cy="68" r="10" className="fill-amber-500" />
            <text x="332" y="52" textAnchor="middle" fontSize="11" fill="currentColor">m (q)</text>
            <line x1="210" y1="100" x2="332" y2="68" stroke="currentColor" strokeWidth="1.8" />
            <text x="268" y="76" textAnchor="middle" fontSize="11" fill="currentColor">r</text>
            <line x1="332" y1="68" x2="352" y2="112" stroke="#0284c7" strokeWidth="2.5" />
            <text x="364" y="114" fontSize="11" fill="#0284c7" fontWeight="bold">v</text>
            <line x1="332" y1="68" x2="294" y2="78" stroke="#e11d48" strokeWidth="2.5" />
            <text x="285" y="96" fontSize="11" fill="#e11d48" fontWeight="bold">Fg</text>
          </svg>
        );

      case 'kirchhoff_loop':
        return (
          <svg viewBox="0 0 420 200" className="w-full max-w-md h-auto" role="img" aria-label={diagram.titleAr}>
            <rect x="60" y="35" width="300" height="130" fill="none" stroke="currentColor" strokeWidth="2" />
            <line x1="210" y1="35" x2="210" y2="165" stroke="currentColor" strokeWidth="2" />
            <circle cx="210" cy="35" r="5" className="fill-sky-600" />
            <text x="210" y="24" textAnchor="middle" fontSize="11" fill="currentColor" fontWeight="bold">I₁ = I₂ + I₃ (عقدة)</text>
            <rect x="110" y="27" width="44" height="16" className="fill-amber-100 dark:fill-amber-900" stroke="currentColor" />
            <text x="132" y="39" textAnchor="middle" fontSize="10" fill="currentColor">R₁</text>
            <rect x="266" y="27" width="44" height="16" className="fill-amber-100 dark:fill-amber-900" stroke="currentColor" />
            <text x="288" y="39" textAnchor="middle" fontSize="10" fill="currentColor">R₂</text>
            <text x="80" y="105" fontSize="12" fill="#0284c7" fontWeight="bold">ε₁</text>
            <text x="330" y="105" fontSize="12" fill="#0284c7" fontWeight="bold">ε₂</text>
            <text x="135" y="106" textAnchor="middle" fontSize="11" fill="currentColor">ΣE = ΣIR</text>
            <text x="285" y="106" textAnchor="middle" fontSize="11" fill="currentColor">حلقة ٢</text>
          </svg>
        );

      case 'electric_capacitor':
        return (
          <svg viewBox="0 0 420 190" className="w-full max-w-md h-auto" role="img" aria-label={diagram.titleAr}>
            <line x1="50" y1="95" x2="175" y2="95" stroke="currentColor" strokeWidth="2.5" />
            <line x1="175" y1="45" x2="175" y2="145" stroke="#0284c7" strokeWidth="4" />
            <line x1="215" y1="45" x2="215" y2="145" stroke="#e11d48" strokeWidth="4" />
            <line x1="215" y1="95" x2="340" y2="95" stroke="currentColor" strokeWidth="2.5" />
            <text x="155" y="60" fontSize="12" fill="#0284c7" fontWeight="bold">+Q</text>
            <text x="225" y="60" fontSize="12" fill="#e11d48" fontWeight="bold">-Q</text>
            <text x="195" y="170" textAnchor="middle" fontSize="11" fill="currentColor">C = Q / V | E = ½CV²</text>
          </svg>
        );

      case 'wave_interference':
      case 'photoelectric':
        return (
          <svg viewBox="0 0 420 190" className="w-full max-w-md h-auto" role="img" aria-label={diagram.titleAr}>
            <line x1="50" y1="155" x2="380" y2="155" stroke="currentColor" strokeWidth="1.5" />
            <line x1="70" y1="25" x2="70" y2="165" stroke="currentColor" strokeWidth="1.5" />
            {diagram.svgKind === 'photoelectric' ? (
              <>
                <line x1="140" y1="155" x2="340" y2="40" stroke="#0284c7" strokeWidth="2.8" />
                <line x1="70" y1="155" x2="140" y2="155" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth="2" />
                <circle cx="140" cy="155" r="4" className="fill-rose-600" />
                <text x="140" y="174" textAnchor="middle" fontSize="11" fill="currentColor">f₀</text>
                <text x="275" y="62" fontSize="11" fill="#0284c7" fontWeight="bold">Slope = h</text>
                <text x="35" y="40" fontSize="11" fill="currentColor">KEmax</text>
              </>
            ) : (
              <>
                <rect x="65" y="35" width="8" height="45" fill="currentColor" />
                <rect x="65" y="95" width="8" height="20" fill="currentColor" />
                <rect x="65" y="130" width="8" height="35" fill="currentColor" />
                <line x1="73" y1="87" x2="335" y2="95" stroke="#0284c7" strokeWidth="2" />
                <line x1="73" y1="122" x2="335" y2="95" stroke="#0d9488" strokeWidth="2" />
                <line x1="338" y1="30" x2="338" y2="165" stroke="currentColor" strokeWidth="3" />
                <circle cx="338" cy="95" r="5" className="fill-amber-500" />
                <text x="205" y="175" textAnchor="middle" fontSize="11" fill="currentColor">λ = (a · x) / D</text>
              </>
            )}
          </svg>
        );

      case 'born_haber':
        return (
          <svg viewBox="0 0 420 200" className="w-full max-w-md h-auto" role="img" aria-label={diagram.titleAr}>
            <line x1="55" y1="25" x2="55" y2="175" stroke="currentColor" strokeWidth="1.5" />
            <line x1="95" y1="120" x2="210" y2="120" stroke="currentColor" strokeWidth="2" />
            <text x="152" y="114" textAnchor="middle" fontSize="10" fill="currentColor">Na(s) + ½Cl₂(g)</text>
            <line x1="220" y1="45" x2="355" y2="45" stroke="#0284c7" strokeWidth="2.5" />
            <text x="288" y="37" textAnchor="middle" fontSize="10" fill="#0284c7" fontWeight="bold">Na⁺(g) + Cl⁻(g)</text>
            <line x1="220" y1="165" x2="355" y2="165" stroke="#059669" strokeWidth="2.5" />
            <text x="288" y="182" textAnchor="middle" fontSize="10" fill="#059669" fontWeight="bold">NaCl(s)</text>
            <line x1="288" y1="48" x2="288" y2="160" stroke="#e11d48" strokeWidth="2.2" />
            <text x="330" y="106" fontSize="11" fill="#e11d48" fontWeight="bold">ΔH°latt</text>
            <line x1="152" y1="122" x2="218" y2="165" stroke="currentColor" strokeDasharray="4 3" strokeWidth="1.8" />
            <text x="165" y="158" fontSize="10" fill="currentColor">ΔH°f</text>
          </svg>
        );

      case 'equilibrium_acid':
      case 'electrochemical_cell':
      case 'kinetics_arrhenius':
        return (
          <svg viewBox="0 0 420 190" className="w-full max-w-md h-auto" role="img" aria-label={diagram.titleAr}>
            <rect x="70" y="55" width="95" height="95" rx="6" fill="none" stroke="#0284c7" strokeWidth="2" />
            <rect x="255" y="55" width="95" height="95" rx="6" fill="none" stroke="#059669" strokeWidth="2" />
            <path d="M 145 75 Q 210 25 275 75" fill="none" stroke="#d97706" strokeWidth="6" />
            <line x1="110" y1="45" x2="110" y2="120" stroke="currentColor" strokeWidth="5" />
            <line x1="310" y1="45" x2="310" y2="120" stroke="currentColor" strokeWidth="5" />
            <line x1="110" y1="30" x2="310" y2="30" stroke="currentColor" strokeWidth="2" />
            <circle cx="210" cy="30" r="14" className="fill-white dark:fill-slate-900" stroke="currentColor" strokeWidth="2" />
            <text x="210" y="34" textAnchor="middle" fontSize="11" fill="currentColor" fontWeight="bold">V</text>
            <text x="117" y="172" textAnchor="middle" fontSize="11" fill="currentColor">أنود (-) / وسط ١</text>
            <text x="303" y="172" textAnchor="middle" fontSize="11" fill="currentColor">كاثود (+) / وسط ٢</text>
          </svg>
        );

      case 'dna_replication':
      case 'pcr_cycles':
        return (
          <svg viewBox="0 0 420 190" className="w-full max-w-md h-auto" role="img" aria-label={diagram.titleAr}>
            <line x1="55" y1="95" x2="175" y2="95" stroke="#0284c7" strokeWidth="4" />
            <line x1="175" y1="95" x2="345" y2="48" stroke="#0284c7" strokeWidth="3.5" />
            <line x1="175" y1="95" x2="345" y2="142" stroke="#059669" strokeWidth="3.5" />
            <line x1="205" y1="62" x2="335" y2="62" stroke="#f59e0b" strokeDasharray="6 4" strokeWidth="3" />
            <line x1="205" y1="128" x2="335" y2="128" stroke="#e11d48" strokeDasharray="10 5" strokeWidth="3" />
            <circle cx="175" cy="95" r="12" className="fill-sky-600/20" stroke="#0284c7" strokeWidth="2" />
            <text x="175" y="126" textAnchor="middle" fontSize="10" fill="currentColor">Helicase</text>
            <text x="285" y="38" textAnchor="middle" fontSize="10" fill="currentColor">5' → 3' Leading</text>
            <text x="285" y="164" textAnchor="middle" fontSize="10" fill="currentColor">Okazaki Fragments</text>
          </svg>
        );

      case 'action_potential':
        return (
          <svg viewBox="0 0 420 195" className="w-full max-w-md h-auto" role="img" aria-label={diagram.titleAr}>
            <line x1="65" y1="150" x2="370" y2="150" stroke="currentColor" strokeOpacity="0.4" />
            <line x1="65" y1="25" x2="65" y2="170" stroke="currentColor" strokeWidth="1.5" />
            <line x1="65" y1="115" x2="360" y2="115" stroke="#94a3b8" strokeDasharray="4 4" />
            <path d="M 65 135 L 125 135 L 150 115 L 185 35 L 225 152 L 265 135 L 350 135" fill="none" stroke="#e11d48" strokeWidth="3" />
            <text x="35" y="138" fontSize="10" fill="currentColor">-70mV</text>
            <text x="35" y="118" fontSize="10" fill="currentColor">-55mV</text>
            <text x="35" y="42" fontSize="10" fill="currentColor">+30mV</text>
            <text x="185" y="24" textAnchor="middle" fontSize="10" fill="#e11d48" fontWeight="bold">إزالة الاستقطاب (Na⁺)</text>
            <text x="260" y="95" fontSize="10" fill="#0284c7" fontWeight="bold">إعادة الاستقطاب (K⁺)</text>
          </svg>
        );

      case 'calvin_cycle':
        return (
          <svg viewBox="0 0 420 195" className="w-full max-w-md h-auto" role="img" aria-label={diagram.titleAr}>
            <circle cx="210" cy="98" r="62" fill="none" stroke="#059669" strokeWidth="3" strokeDasharray="8 4" />
            <text x="210" y="92" textAnchor="middle" fontSize="12" fill="#059669" fontWeight="bold">دورة كالفن</text>
            <text x="210" y="110" textAnchor="middle" fontSize="10" fill="currentColor">ATP + NADPH</text>
            <text x="210" y="24" textAnchor="middle" fontSize="11" fill="currentColor">CO₂ + RuBP → 2 GP</text>
            <text x="330" y="102" fontSize="10" fill="currentColor">اختزال → TP</text>
            <text x="210" y="182" textAnchor="middle" fontSize="11" fill="currentColor">تجدد RuBP + بناء الجلوكوز</text>
          </svg>
        );

      case 'unit_circle_radian':
        return (
          <svg viewBox="0 0 420 195" className="w-full max-w-md h-auto" role="img" aria-label={diagram.titleAr}>
            <circle cx="210" cy="98" r="66" fill="none" stroke="currentColor" strokeWidth="2" />
            <line x1="120" y1="98" x2="300" y2="98" stroke="currentColor" strokeOpacity="0.4" />
            <line x1="210" y1="18" x2="210" y2="178" stroke="currentColor" strokeOpacity="0.4" />
            <line x1="210" y1="98" x2="262" y2="57" stroke="#0284c7" strokeWidth="2.5" />
            <path d="M 276 98 A 66 66 0 0 0 262 57" fill="none" stroke="#e11d48" strokeWidth="3.5" />
            <text x="240" y="88" fontSize="11" fill="currentColor">θ rad</text>
            <text x="285" y="72" fontSize="11" fill="#e11d48" fontWeight="bold">L = rθ</text>
            <text x="234" y="112" fontSize="10" fill="currentColor">r</text>
          </svg>
        );

      case 'derivative_tangent':
      case 'integral_area':
      case 'normal_curve':
        return (
          <svg viewBox="0 0 420 195" className="w-full max-w-md h-auto" role="img" aria-label={diagram.titleAr}>
            <line x1="60" y1="155" x2="360" y2="155" stroke="currentColor" strokeWidth="1.5" />
            <line x1="80" y1="25" x2="80" y2="165" stroke="currentColor" strokeWidth="1.5" />
            {diagram.svgKind === 'normal_curve' ? (
              <>
                <path d="M 75 152 C 130 150, 165 40, 215 40 C 265 40, 300 150, 355 152" fill="rgba(2,132,199,0.16)" stroke="#0284c7" strokeWidth="2.8" />
                <line x1="215" y1="35" x2="215" y2="155" stroke="#e11d48" strokeDasharray="4 4" strokeWidth="1.8" />
                <text x="215" y="174" textAnchor="middle" fontSize="11" fill="currentColor">μ (Z = 0)</text>
              </>
            ) : diagram.svgKind === 'integral_area' ? (
              <>
                <path d="M 120 155 L 120 115 Q 210 35 300 85 L 300 155 Z" fill="rgba(2,132,199,0.22)" stroke="none" />
                <path d="M 90 135 Q 210 25 330 95" fill="none" stroke="#0284c7" strokeWidth="3" />
                <text x="120" y="173" textAnchor="middle" fontSize="11" fill="currentColor">a</text>
                <text x="300" y="173" textAnchor="middle" fontSize="11" fill="currentColor">b</text>
                <text x="210" y="128" textAnchor="middle" fontSize="11" fill="#0284c7" fontWeight="bold">∫ f(x) dx</text>
              </>
            ) : (
              <>
                <path d="M 95 140 Q 210 20 325 140" fill="none" stroke="#0284c7" strokeWidth="3" />
                <line x1="145" y1="80" x2="275" y2="80" stroke="#e11d48" strokeWidth="2.2" />
                <circle cx="210" cy="80" r="4.5" className="fill-rose-600" />
                <text x="210" y="64" textAnchor="middle" fontSize="11" fill="#e11d48" fontWeight="bold">f'(x) = 0</text>
              </>
            )}
          </svg>
        );

      case 'custom_image':
      default:
        if (diagram.imageUrl && !imgError) {
          return (
            <img
              src={diagram.imageUrl}
              alt={diagram.titleAr}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="max-h-64 rounded-lg object-contain border border-slate-200 dark:border-slate-700"
            />
          );
        }
        return (
          <div className="text-xs text-slate-500 dark:text-slate-400 py-4">
            مخطط توضيحي: {diagram.titleAr}
          </div>
        );
    }
  };

  return (
    <figure className="my-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
          شكل توضيحي: {diagram.titleAr}
        </span>
      </div>
      <div
        dir="ltr"
        className="flex justify-center items-center py-2 text-slate-800 dark:text-slate-100 overflow-x-auto"
      >
        {renderSvgSchematic()}
      </div>
      <figcaption className="mt-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed text-center">
        {diagram.captionAr}
      </figcaption>
    </figure>
  );
}
