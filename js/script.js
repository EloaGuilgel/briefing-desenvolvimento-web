// =========================================================
// BRIEFING — navegação entre etapas, validação e envio
// =========================================================

const screens = {
  intro: document.getElementById('intro'),
  form: document.getElementById('form-screen'),
  thanks: document.getElementById('thanks'),
};

const form = document.getElementById('briefing-form');
const steps = [...form.querySelectorAll('.step')];
const total = steps.length;

const stepLabel = document.getElementById('step-label');
const stepPercent = document.getElementById('step-percent');
const progressFill = document.getElementById('progress-fill');

let current = 1;
let enviado = false; // true depois que as respostas foram enviadas

// ---------- Trocar de tela ----------
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('is-active'));
  screens[name].classList.add('is-active');
  window.scrollTo({ top: 0 });
}

// ---------- Mostrar etapa ----------
function showStep(n) {
  current = n;
  steps.forEach(s => s.classList.toggle('is-active', Number(s.dataset.step) === n));

  const pct = Math.round((n / total) * 100);
  stepLabel.textContent = `Etapa ${n} de ${total}`;
  stepPercent.textContent = `${pct}%`;
  progressFill.style.width = `${pct}%`;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- Validação (só campos obrigatórios) ----------
function validateStep(n) {
  const step = steps[n - 1];
  let ok = true;

  step.querySelectorAll('[required]').forEach(input => {
    const field = input.closest('.field');
    const valid = input.value.trim() !== '' && input.checkValidity();
    field.classList.toggle('has-error', !valid);
    if (!valid && ok) {
      input.focus();
      ok = false;
    }
  });

  return ok;
}

// Limpa o erro assim que a pessoa digita
form.addEventListener('input', e => {
  const field = e.target.closest('.field');
  if (field && field.classList.contains('has-error') && e.target.checkValidity() && e.target.value.trim()) {
    field.classList.remove('has-error');
  }
});

// ---------- Botões ----------
document.querySelector('[data-go="1"]').addEventListener('click', () => {
  // Depois de um envio, começar de novo não reaproveita as respostas já enviadas
  if (enviado) return novoPreenchimento();
  showScreen('form');
  showStep(1);
});

form.addEventListener('click', e => {
  if (e.target.closest('[data-next]')) {
    if (validateStep(current)) showStep(current + 1);
  }
  if (e.target.closest('[data-prev]')) {
    showStep(current - 1);
  }
});

// Enter num input não envia o formulário antes da hora
form.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
    e.preventDefault();
    const next = steps[current - 1].querySelector('[data-next]');
    if (next) next.click();
  }
});

// ---------- Envio ----------
form.addEventListener('submit', e => {
  e.preventDefault();
  if (!validateStep(current)) return;

  // Perguntas de múltipla escolha viram uma lista com todas as opções marcadas
  const fd = new FormData(form);
  const dados = {};
  for (const name of new Set(fd.keys())) {
    const multipla = form.querySelector(`[type="checkbox"][name="${name}"]`);
    dados[name] = multipla ? fd.getAll(name) : fd.get(name);
  }
  console.log('Respostas do briefing:', dados);

  // Aqui você pode enviar os dados para um serviço
  // (Formspree, EmailJS, Google Sheets, sua API...). Exemplo:
  // fetch('SUA_URL', { method: 'POST', body: JSON.stringify(dados) })

  enviado = true;
  showScreen('thanks');
});

// ---------- Tela final ----------
const confirmRestart = document.getElementById('confirm-restart');

// Limpa os campos e volta para a etapa 1. Só é chamado depois do envio.
function novoPreenchimento() {
  form.reset();
  enviado = false;
  form.querySelectorAll('.has-error').forEach(f => f.classList.remove('has-error'));
  // Atualiza a cor dos selects e esconde as perguntas condicionais
  form.querySelectorAll('select, [type="checkbox"]').forEach(c => c.dispatchEvent(new Event('change')));
  showScreen('form');
  showStep(1);
}

document.querySelector('[data-home]').addEventListener('click', () => showScreen('intro'));
document.querySelector('[data-restart]').addEventListener('click', () => confirmRestart.showModal());
confirmRestart.querySelector('[data-cancel]').addEventListener('click', () => confirmRestart.close());
confirmRestart.querySelector('[data-confirm]').addEventListener('click', () => {
  confirmRestart.close();
  novoPreenchimento();
});

// ---------- Select com cor de placeholder ----------
form.querySelectorAll('select').forEach(sel => {
  const update = () => sel.classList.toggle('is-empty', !sel.value);
  update();
  sel.addEventListener('change', update);
});

// ---------- Máscara de telefone: (11) 91234-5678 ----------
const telefone = document.getElementById('telefone');
telefone.addEventListener('input', () => {
  const d = telefone.value.replace(/\D/g, '').slice(0, 11);
  let v = d;
  if (d.length > 2) v = `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length > 7) v = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  telefone.value = v;
});

// ---------- Perguntas condicionais ----------
// O campo só aparece (e só é enviado) quando a pergunta anterior
// tem uma das respostas indicadas em data-show-value (separadas por |).
// Ao ficar escondido, a resposta é apagada para não ser enviada por engano.
form.querySelectorAll('[data-show-if]').forEach(field => {
  const controls = [...form.querySelectorAll(`[name="${field.dataset.showIf}"]`)];
  const values = field.dataset.showValue.split('|');
  const input = field.querySelector('input, select, textarea');
  const update = () => {
    const show = controls.some(c =>
      (c.type === 'checkbox' ? c.checked : true) && values.includes(c.value));
    field.hidden = !show;
    input.disabled = !show;
    if (!show && input.value) {
      if (input.tagName === 'SELECT') input.selectedIndex = 0;
      else input.value = '';
      input.dispatchEvent(new Event('change'));
    }
  };
  update();
  controls.forEach(c => c.addEventListener('change', update));
});
