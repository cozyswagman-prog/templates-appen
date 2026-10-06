// Exporterar ett projekt som en fristående zip: en html-fil per sida + images/.
// Rendering sker från templatens källa + projektets sparade värden, så alla
// sidor kommer med även om de inte är öppna i editorn just nu.
window.Exporter = (function () {

  function slugify(name) {
    return (name || 'min-hemsida')
      .toLowerCase()
      .replace(/[åä]/g, 'a').replace(/ö/g, 'o')
      .replace(/[éèêë]/g, 'e').replace(/[üú]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'min-hemsida';
  }

  async function exportSite(project) {
    const { pages, files, fontFiles } = window.SiteRenderer.render(project);
    const zip = new JSZip();
    for (const [name, data] of files) zip.file(name, data);

    // Packa med de självhostade typsnitten sidorna använder, plus licensen
    if (fontFiles.size) {
      const fonts = zip.folder('fonts');
      for (const name of fontFiles) {
        const r = await fetch('fonts/' + name);
        if (r.ok) fonts.file(name, await r.arrayBuffer());
      }
      const lic = await fetch('fonts/LICENS.txt');
      if (lic.ok) fonts.file('LICENS.txt', await lic.text());
    }

    const sidlista = pages.map(p => '  - ' + p.file + ' (' + p.title + ')').join('\n');
    zip.file('LASMIG.txt',
      'Din hemsida är nedladdad – den är inte publicerad på nätet ännu.\n\n' +
      'TITTA PÅ HEMSIDAN\n' +
      '1. Packa upp zip-filen till en egen mapp.\n' +
      '2. Öppna index.html i din webbläsare. Kontrollera texter, bilder och länkar.\n\n' +
      'FORTSÄTT REDIGERA\n' +
      'Öppna projektet i Templates under Mina projekt. Spara också en projektfil\n' +
      'som säkerhetskopia; zip-filen kan inte importeras som ett redigerbart projekt.\n\n' +
      'Filer:\n' + sidlista + '\n  - mappen images (dina bilder)\n' +
      (fontFiles.size ? '  - mappen fonts (typsnitt, se fonts/LICENS.txt)\n' : '') + '\n' +
      'PUBLICERA PÅ NÄTET\n' +
      'När innehållet är kontrollerat: ladda upp alla uppackade filer och mappar\n' +
      'till webbplatsens mapp hos ditt webbhotell. Behåll mapparnas struktur.\n' +
      'Öppna därefter webbplatsens adress och kontrollera att den fungerar.\n\n' +
      'BOKNING, BETALNING OCH FORMULÄR\n' +
      'Filter, bildväxling och prisindikator fungerar direkt i filerna.\n' +
      'Externa boknings- och köplänkar kräver din egen anslutna tjänst och internet.\n' +
      'Formulär kräver en konfigurerad Formspree-mottagare. Prova mottagningen\n' +
      'på den publicerade adressen innan sajten börjar användas av kunder.\n' +
      'Ej anslutna funktioner tar inte emot bokningar, betalningar eller förfrågningar.\n\n' +
      'Skapad med Templates.');

    const blob = await zip.generateAsync({ type: 'blob' });
    return window.saveFile(blob, slugify(project.name) + '.zip');
  }

  return { exportSite };
})();
