// The sign-in form. The page shows no team data until the password is right.
const form = document.getElementById('signin');
const msg = document.getElementById('msg');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = 'Checking…';
  const res = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Team-Page': '1' }, body: JSON.stringify({ password: document.getElementById('pw').value }) });
  const data = await res.json().catch(() => ({}));
  if (res.ok) location.reload();
  else msg.textContent = data.message || 'That did not work.';
});
