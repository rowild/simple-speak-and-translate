import fs from 'fs';
const data = JSON.parse(fs.readFileSync('./public/app-info.json', 'utf8'));

const translations = {
  en: { updateAvailable: 'A new version is available', updateNow: 'Update Now' },
  bg: { updateAvailable: 'Налична е нова версия', updateNow: 'Обновяване' },
  hr: { updateAvailable: 'Dostupna je nova verzija', updateNow: 'Ažuriraj' },
  cs: { updateAvailable: 'Je k dispozici nová verze', updateNow: 'Aktualizovat' },
  da: { updateAvailable: 'En ny version er tilgængelig', updateNow: 'Opdater nu' },
  nl: { updateAvailable: 'Er is een nieuwe versie beschikbaar', updateNow: 'Nu bijwerken' },
  et: { updateAvailable: 'Saadaval on uus versioon', updateNow: 'Uuenda nüüd' },
  fi: { updateAvailable: 'Uusi versio on saatavilla', updateNow: 'Päivitä nyt' },
  fr: { updateAvailable: 'Une nouvelle version est disponible', updateNow: 'Mettre à jour' },
  de: { updateAvailable: 'Eine neue Version ist verfügbar', updateNow: 'Jetzt aktualisieren' },
  el: { updateAvailable: 'Μια νέα έκδοση είναι διαθέσιμη', updateNow: 'Ενημέρωση τώρα' },
  hu: { updateAvailable: 'Új verzió érhető el', updateNow: 'Frissítés most' },
  ga: { updateAvailable: 'Tá leagan nua ar fáil', updateNow: 'Nuashonraigh anois' },
  it: { updateAvailable: 'È disponibile una nuova versione', updateNow: 'Aggiorna ora' },
  lv: { updateAvailable: 'Ir pieejama jauna versija', updateNow: 'Atjaunināt tagad' },
  lt: { updateAvailable: 'Yra nauja versija', updateNow: 'Atnaujinti dabar' },
  mt: { updateAvailable: 'Verżjoni ġdida disponibbli', updateNow: 'Aġġorna issa' },
  pl: { updateAvailable: 'Dostępna jest nowa wersja', updateNow: 'Aktualizuj teraz' },
  pt: { updateAvailable: 'Uma nova versão está disponível', updateNow: 'Atualizar agora' },
  ro: { updateAvailable: 'O nouă versiune este disponibilă', updateNow: 'Actualizează acum' },
  sk: { updateAvailable: 'Je dostupná nová verzia', updateNow: 'Aktualizovať teraz' },
  sl: { updateAvailable: 'Na voljo je nova različica', updateNow: 'Posodobi zdaj' },
  es: { updateAvailable: 'Hay una nueva versión disponible', updateNow: 'Actualizar ahora' },
  sv: { updateAvailable: 'En ny version finns tillgänglig', updateNow: 'Uppdatera nu' },
  is: { updateAvailable: 'Ný útgáfa er tiltæk', updateNow: 'Uppfæra núna' },
  no: { updateAvailable: 'En ny versjon er tilgjengelig', updateNow: 'Oppdater nå' },
  lb: { updateAvailable: 'Eng nei Versioun ass verfügbar', updateNow: 'Elo aktualiséieren' },
  sq: { updateAvailable: 'Një version i ri është i disponueshëm', updateNow: 'Përditëso tani' },
  sr: { updateAvailable: 'Доступна је нова верзија', updateNow: 'Ажурирај сада' },
  mk: { updateAvailable: 'Достапна е нова верзија', updateNow: 'Ажурирај сега' },
  bs: { updateAvailable: 'Dostupna je nova verzija', updateNow: 'Ažuriraj sada' },
  uk: { updateAvailable: 'Доступна нова версія', updateNow: 'Оновити зараз' },
  ru: { updateAvailable: 'Доступна новая версия', updateNow: 'Обновить сейчас' },
  tr: { updateAvailable: 'Yeni bir sürüm mevcut', updateNow: 'Şimdi güncelle' },
  zh: { updateAvailable: '有新版本可用', updateNow: '立即更新' },
  ja: { updateAvailable: '新しいバージョンが利用可能です', updateNow: '今すぐ更新' },
  ko: { updateAvailable: '새 버전을 사용할 수 있습니다', updateNow: '지금 업데이트' },
  ar: { updateAvailable: 'يتوفر إصدار جديد', updateNow: 'تحديث الآن' },
  he: { updateAvailable: 'גרסה חדשה זמינה', updateNow: 'עדכן עכשיו' }
};

for (const [lang, trans] of Object.entries(translations)) {
  if (data[lang] && data[lang].ui) {
    data[lang].ui.updateAvailable = trans.updateAvailable;
    data[lang].ui.updateNow = trans.updateNow;
  }
}

fs.writeFileSync('./public/app-info.json', JSON.stringify(data, null, 2));
console.log('Update translations added successfully!');
