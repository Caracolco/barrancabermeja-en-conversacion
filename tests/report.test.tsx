// @vitest-environment jsdom
/**
 * Informe ejecutivo: cifras coherentes entre capítulos, evidencias verificables y navegación por capítulos
 * con botones y teclado.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import { buildStory, REGISTROS } from '../src/report/story';
import Report, { CHAPTERS } from '../src/report/Report';

const story = buildStory();

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('cifras del informe', () => {
  it('máximo seis capítulos y la estructura pedida', () => {
    expect(CHAPTERS.length).toBeLessThanOrEqual(6);
    expect(CHAPTERS.map((c) => c.label)).toEqual([
      'Portada',
      'La conversación',
      'Ciro Fernández',
      '¿De qué habla Barrancabermeja?',
      'Percepciones y voces ciudadanas',
      'Conclusiones',
    ]);
  });

  it('meses, semanas, plataformas y voces suman el total analizado', () => {
    const c = story.conversation;
    const total = story.analyzed;
    expect(c.months.reduce((a, m) => a + m.total, 0)).toBe(total);
    expect(c.weekly.reduce((a, w) => a + w.total, 0)).toBe(total);
    expect(c.platforms.reduce((a, p) => a + p.n, 0)).toBe(total);
    expect(Object.values(c.voices).reduce((a, n) => a + n, 0)).toBe(total);
  });

  it('Ciro: propias + terceros = directas, y la serie mensual suma lo mismo', () => {
    const c = story.ciro;
    expect(c.own + c.third).toBe(c.direct);
    expect(c.monthly.reduce((a, m) => a + m.propia + m.terceros, 0)).toBe(c.direct);
    expect(c.direct + c.otherRecords).toBe(story.analyzed);
    expect(Object.values(c.tone).reduce((a, n) => a + n, 0)).toBe(c.own);
  });

  it('temas y sentimiento suman el total; la crítica a Ciro sale de la base', () => {
    expect(story.topics.rows.reduce((a, t) => a + t.total, 0)).toBe(story.analyzed);
    expect(Object.values(story.sentiment.counts).reduce((a, n) => a + n, 0)).toBe(story.analyzed);
    expect(Object.values(story.sentiment.negTargets).reduce((a, n) => a + n, 0)).toBe(story.sentiment.counts.negativo);
    expect(story.sentiment.negToCiro).toBe(REGISTROS.filter((r) => r.sentimiento === 'negativo' && r.objetivo === 'ciro').length);
  });

  it('los temas se ordenan por volumen real', () => {
    const totals = story.topics.rows.map((t) => t.total);
    expect([...totals].sort((a, b) => b - a)).toEqual(totals);
    expect(story.topics.rows[0].label).toBe('Seguridad y convivencia');
  });

  it('cinco conclusiones cuantificadas y sin predicciones electorales', () => {
    expect(story.conclusions).toHaveLength(5);
    for (const c of story.conclusions) {
      expect(c.figure).toMatch(/\d/);
      expect(`${c.title} ${c.text}`).not.toMatch(/ganar[áa]|favorit|intenci[oó]n de voto de|encuesta/i);
    }
  });

  it('todas las evidencias se encontraron en la base', () => {
    expect(story.evidence.ciudad.list).toHaveLength(story.evidence.ciudad.items.length);
    expect(story.evidence.ciro.list).toHaveLength(story.evidence.ciro.items.length);
    expect(story.evidence.temas).toHaveLength(3);
  });
});

describe('navegación del informe', () => {
  const headline = () => screen.getByRole('heading', { level: 2 }).textContent ?? '';

  it('abre en la portada con el título y el período', () => {
    render(<Report />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Barrancabermeja en Conversación');
    expect(screen.getByText(/Radiografía de la conversación pública digital/)).toBeTruthy();
  });

  it('avanza con el botón siguiente y con las flechas del teclado', async () => {
    render(<Report />);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Siguiente' })));
    expect(window.location.hash).toBe('#/conversacion');
    expect(headline()).toMatch(/de la conversación llegó entre/);
    await act(async () => fireEvent.keyDown(window, { key: 'ArrowRight' }));
    expect(window.location.hash).toBe('#/ciro');
    expect(headline()).toContain(`${story.ciro.own} de sus ${story.ciro.direct} registros`);
    await act(async () => fireEvent.keyDown(window, { key: 'ArrowLeft' }));
    expect(window.location.hash).toBe('#/conversacion');
    await act(async () => fireEvent.keyDown(window, { key: 'End' }));
    expect(window.location.hash).toBe('#/conclusiones');
    await act(async () => fireEvent.keyDown(window, { key: 'Home' }));
    expect(window.location.hash).toBe('#/portada');
  });

  it('recorre las pantallas de percepciones y muestra tarjetas con enlace a la fuente', async () => {
    window.location.hash = '#/voces/1';
    render(<Report />);
    const cards = document.querySelectorAll('[data-evidence]');
    expect(cards).toHaveLength(story.evidence.ciudad.list.length);
    for (const card of cards) {
      const link = card.querySelector('a[href^="http"]');
      expect(link?.getAttribute('target')).toBe('_blank');
      expect(card.textContent).toContain('Sobre la ciudad');
    }
    await act(async () => fireEvent.keyDown(window, { key: 'ArrowRight' }));
    expect(window.location.hash).toBe('#/voces/2');
    expect(document.querySelectorAll('[data-evidence]')).toHaveLength(story.evidence.ciro.list.length);
  });

  it('el tono no atribuye a Ciro crítica que no existe', () => {
    window.location.hash = '#/voces';
    render(<Report />);
    expect(headline()).toMatch(story.sentiment.negToCiro === 0 ? /ninguna a Ciro/ : /a Ciro/);
  });

  it('abre el texto completo de una evidencia y Escape lo cierra sin cambiar de capítulo', async () => {
    window.location.hash = '#/voces/2';
    render(<Report />);
    const button = screen.getAllByRole('button', { name: /Leer completo|Detalle/ })[0];
    await act(async () => fireEvent.click(button));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Por qué se eligió');
    await act(async () => fireEvent.keyDown(window, { key: 'ArrowRight' }));
    expect(window.location.hash).toBe('#/voces/2');
    await act(async () => fireEvent.keyDown(window, { key: 'Escape' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('cada capítulo se dibuja sin errores', async () => {
    for (const c of CHAPTERS)
      for (let step = 0; step < c.steps.length; step++) {
        window.location.hash = `#/${c.id}${step ? `/${step}` : ''}`;
        const { unmount } = render(<Report />);
        expect(document.querySelector('main section')).toBeTruthy();
        unmount();
      }
  });
});
