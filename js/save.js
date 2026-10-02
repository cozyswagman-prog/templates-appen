// Gemensam filnedladdning. På claude.ai (publicerad app) går sparandet via
// downloads-kapaciteten — vanliga nedladdningslänkar är blockerade där.
// Lokalt används en vanlig länk. Returnerar 'saved', 'declined' eller 'error'.
window.saveFile = async function (blob, filename) {
  if (window.claude && typeof window.claude.use === 'function') {
    try {
      const downloads = await window.claude.use('downloads');
      if (downloads) {
        await downloads.save({ filename, data: blob });
        return 'saved';
      }
    } catch (e) {
      if (e && e.code === 'declined') return 'declined';
      if (e && e.code === 'rate_limited') {
        window.showToast('En nedladdning är redan på gång — vänta en stund.');
        return 'error';
      }
      console.error('downloads.save misslyckades:', e);
      return 'error';
    }
  }

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return 'saved';
};
