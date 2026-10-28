(() => {
  const nameInput = document.getElementById('domain-name');
  const targetInput = document.getElementById('target-url');
  const reasonInput = document.getElementById('reason');
  const feedback = document.getElementById('feedback');
  const requestButton = document.getElementById('request-button');
  const parentDomain = 'defchat.net';
  const reserved = new Set(['www','mail','ftp','admin','administrator','api','ns1','ns2','root','support','security','abuse','status','docs','help']);
  const pattern = /^(?=.{3,32}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
  function validate() {
    const name = nameInput.value.trim().toLowerCase();
    nameInput.value = name;
    let message = 'Enter a name to validate its format.';
    let valid = false;
    if (name) {
      if (!pattern.test(name)) message = 'Use 3–32 lowercase letters, numbers or hyphens. Do not start or end with a hyphen.';
      else if (reserved.has(name)) message = 'That name is reserved for infrastructure or safety.';
      else { message = 'Name format looks valid. Availability and DNS ownership for ' + parentDomain + ' have not been verified.'; valid = true; }
    }
    feedback.textContent = message;
    feedback.className = 'feedback' + (valid ? ' good' : (name ? ' bad' : ''));
    requestButton.disabled = !valid;
    return valid;
  }
  nameInput.addEventListener('input', validate);
  requestButton.addEventListener('click', () => {
    if (!validate()) return;
    const name = nameInput.value;
    const target = targetInput.value.trim();
    const reason = reasonInput.value.trim();
    if (target) {
      try {
        const url = new URL(target);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid');
      } catch {
        feedback.textContent = 'Enter a valid destination URL beginning with https:// or http://.';
        feedback.className = 'feedback bad';
        targetInput.focus();
        return;
      }
    }
    const title = '[Domain request] ' + name + '.' + parentDomain;
    const body = [
      '## Domain request',
      '',
      '- Requested hostname: `' + name + '.' + parentDomain + '`',
      '- Proposed destination: ' + (target || '(not supplied)'),
      '- Purpose: ' + (reason || '(not supplied)'),
      '',
      '## Verification',
      '- [ ] Requester controls the destination',
      '- [ ] Name is available in the authoritative registry',
      '- [ ] Ownership/control of ' + parentDomain + ' is verified',
      '- [ ] DNS provider is configured and authorized',
      '',
      '**Note:** This request is not a reservation. ' + parentDomain + ' is the proposed parent domain, but ownership and DNS configuration have not been verified by this project.'
    ].join('\n');
    const url = 'https://github.com/defgodqe-arch/defchat/issues/new?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body) + '&labels=' + encodeURIComponent('domain-request');
    window.open(url, '_blank', 'noopener,noreferrer');
  });
  validate();
})();
