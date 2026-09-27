'use client';
import { Camera, Sun, Frame, Smile, Focus } from 'lucide-react';
import type { PortraitAnalysisResult } from '@/lib/ai/deepseek';
import { APP_CONFIG } from '@/lib/config';
import styles from './FastScanReport.module.css';
const icons = [Sun, Frame, Smile, Focus];
function numericScore(raw: string): number | null {
  const value = parseFloat(raw);
  return Number.isFinite(value) && value >= 0 && value <= 10 ? value : null;
}
export function FastScanReport({ report, photoUrl }: { report: PortraitAnalysisResult; photoUrl: string | null }) {
  const score = numericScore(report.overallScore);
  const metrics = report.metrics.map(metric => ({ ...metric, value: numericScore(metric.score) }));
  const strongest = metrics.filter(m => m.value !== null).sort((a, b) => b.value! - a.value!)[0];
  return <article className={styles.report} aria-label="Quick portrait assessment">
    <header className={styles.masthead}><span>{APP_CONFIG.appName}</span><span><Camera size={14} strokeWidth={1.4} /> The portrait edit</span></header>
    <div className={styles.heading}><p className={styles.eyebrow}>Your quick assessment</p><h2>A closer look<br /><em>at your portrait.</em></h2><p>Light, expression and the details that make this photograph yours.</p></div>
    <div className={styles.hero}>
      <figure className={styles.photo}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="The portrait used for this assessment" />
        ) : <div className={styles.placeholder}><Camera size={40} strokeWidth={1} /><span>Your portrait</span></div>}
        <figcaption>01 / The original photograph</figcaption>
      </figure>
      <div className={styles.verdict}><p className={styles.eyebrow}>Overall impression</p><div className={styles.score}><span>{score === null ? '—' : score.toFixed(1)}</span><small>/ 10</small></div><p className={styles.scoreNote}>A visual impression of this photo</p>
        <div className={styles.summary}><h3>{report.summaryHeading}</h3><p>{report.summaryText}</p></div>
        {strongest && <div className={styles.strength}><span>Highest-rated dimension</span><strong>{strongest.name}</strong></div>}
      </div>
    </div>
    <section className={styles.details}><div className={styles.sectionHeading}><span className={styles.eyebrow}>The details</span><h3>What shapes the impression</h3></div>
      <div className={styles.metrics}>{metrics.map((metric, index) => { const Icon = icons[index % icons.length]; return <div className={styles.metric} key={`${metric.name}-${index}`}>
        <div className={styles.metricHeading}><Icon size={23} strokeWidth={1.25} /><h4>{metric.name}</h4><span>{metric.value === null ? '—' : metric.value.toFixed(1)}<small> / 10</small></span></div>
        <div className={styles.track} aria-hidden="true"><span style={{ width: `${(metric.value ?? 0) * 10}%` }} /></div><p>{metric.note}</p>
      </div>; })}</div>
    </section>
    {report.recommendations?.length > 0 && <section className={styles.advice}><div className={styles.sectionHeading}><span className={styles.eyebrow}>Your next photograph</span><h3>Small changes.<br /><em>A stronger portrait.</em></h3></div><ol>{report.recommendations.map((tip, index) => <li key={index}><span>{String(index + 1).padStart(2, '0')}</span><p>{tip}</p></li>)}</ol></section>}
    <footer className={styles.footer}><span>A study in light & expression</span><span>{APP_CONFIG.appName}</span></footer>
  </article>;
}
