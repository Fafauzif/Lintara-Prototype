import type { Language } from '../domain/types';

const exact:Record<string,string>={
 'Choose a supported tenant category.':'Pilih kategori toko yang tersedia.',
 'Choose a small, medium, or large footprint.':'Pilih ukuran kecil, sedang, atau besar.',
 'Rotation must be 0°, 90°, 180°, or 270°.':'Rotasi harus 0°, 90°, 180°, atau 270°.',
 'The tenant to move does not exist.':'Toko yang akan dipindahkan tidak ditemukan.',
 'Choose a designated commercial unit or a bounded planning slot; routes and platforms are protected.':'Pilih unit usaha atau ruang simulasi yang tersedia. Jalur pejalan kaki dan peron harus tetap bebas.',
 'This unit does not allow that tenant category.':'Kategori toko ini tidak diizinkan di unit tersebut.',
 'This unit is occupied. Move or remove its current tenant first.':'Unit ini sudah terisi. Pindahkan atau hapus toko yang menempatinya terlebih dahulu.',
 'The unit is too small for this footprint and rotation.':'Unit terlalu kecil untuk ukuran dan rotasi ini.',
 'This footprint crosses the commercial boundary or route clearance.':'Ukuran toko melewati batas ruang usaha atau menghalangi jalur.',
 'This footprint overlaps another tenant or an invalid placement.':'Posisi toko bertumpuk dengan toko lain atau penempatan yang tidak valid.',
 'Fits the unit and preserves circulation.':'Ukuran sesuai dengan unit dan jalur tetap bebas.',
 'Unsupported scenario version. Import a version 1 Lintara plan.':'Versi rencana belum didukung. Impor rencana Lintara versi 1.',
 'Tenant category is not supported.':'Kategori toko belum didukung.',
 'Tenant size must be small, medium, or large.':'Ukuran toko harus kecil, sedang, atau besar.',
 'Tenant opening hours must end after they start.':'Waktu tutup toko harus setelah waktu buka.',
 'Tenant rotation must be 0, 90, 180, or 270 degrees.':'Rotasi toko harus 0, 90, 180, atau 270 derajat.',
 'Tenant IDs must be unique.':'Setiap toko harus memiliki ID yang berbeda.',
 'Unsupported event type.':'Jenis kejadian belum didukung.',
 'Event window must fit inside the simulation period.':'Waktu kejadian harus berada di dalam periode simulasi.',
 'Staff event target must reference an existing tenant.':'Perubahan staf harus ditujukan ke toko yang tersedia.',
 'Closure event target must reference a valid route or tenant.':'Penutupan harus ditujukan ke jalur atau toko yang tersedia.',
 'Arrival event target must be platform-a or platform-b.':'Tujuan kedatangan harus peron A (platform-a) atau peron B (platform-b).',
 'Delay event target must reference a valid train ID (train-1 through train-6).':'Tujuan keterlambatan harus kereta yang tersedia, dari train-1 hingga train-6.',
 'Rain applies to the entire station and cannot have a target.':'Hujan berlaku untuk seluruh stasiun dan tidak memerlukan tujuan tertentu.',
 'Campaign objective must be awareness or visits.':'Tujuan kampanye harus pengenalan merek atau kunjungan.',
 'Campaign objective must be awareness, visits, or purchases.':'Tujuan kampanye harus pengenalan merek, kunjungan, atau pembelian.',
 'Campaign creative must be journey or fresh.':'Materi kampanye harus tema perjalanan atau kesegaran.',
 'Campaign archived must be a boolean.':'Status arsip kampanye harus benar atau salah.',
 'Campaign end must be after its start.':'Waktu selesai kampanye harus setelah waktu mulai.',
 'Campaign screen reference does not exist.':'Layar kampanye tidak ditemukan.',
 'Campaign tenant reference does not exist.':'Toko tujuan kampanye tidak ditemukan.',
 'The tenant to remove does not exist.':'Toko yang akan dihapus tidak ditemukan.',
 'The tenant to update does not exist.':'Toko yang akan diperbarui tidak ditemukan.',
 'Tenant identity cannot change during an update.':'ID toko tidak dapat diubah saat memperbarui pengaturan.',
 'Local storage is unavailable in this browser.':'Penyimpanan lokal tidak tersedia di browser ini.',
 'Saved plan IDs must be unique.':'Setiap rencana tersimpan harus memiliki ID yang berbeda.',
 'Saved plan data is too large.':'Data rencana tersimpan terlalu besar.',
 'Unsupported saved plan version.':'Versi rencana tersimpan belum didukung.',
 'Check browser storage permissions.':'Periksa izin penyimpanan browser.',
 'Saved plan data exceeds the local limit. Export a plan as JSON first.':'Data rencana melebihi batas penyimpanan lokal. Ekspor rencana ke JSON terlebih dahulu.',
 'Downloads require a browser.':'Unduhan memerlukan browser.',
 'Choose a report period inside the simulation with end after start.':'Pilih periode laporan di dalam simulasi. Waktu selesai harus setelah waktu mulai.',
 'Printing requires a browser.':'Pencetakan memerlukan browser.',
 'The report window was blocked. Allow pop-ups for Lintara, then try again.':'Jendela laporan diblokir. Izinkan jendela pop-up untuk Lintara, lalu coba lagi.',
 'The selected tenant does not exist.':'Toko yang dipilih tidak ditemukan.',
 'The plan file is too large.':'Berkas rencana terlalu besar.',
 'Unable to complete this action.':'Tindakan belum dapat diselesaikan. Periksa pengaturan, lalu coba lagi.',
 'Unable to evaluate this location.':'Lokasi ini belum dapat dinilai. Periksa pengaturan konsep toko.',
 'Unsupported scenario version or seed.':'Versi rencana atau nilai acak simulasi tidak valid.',
 'Each commercial unit and tenant ID must be unique.':'Setiap unit usaha dan ID toko harus berbeda.',
 'Shop hours must fit the modeled horizon.':'Jam toko harus berada di dalam periode simulasi.',
 'Preparation factor must be between 0 and 4.':'Faktor persiapan harus antara 0 dan 4.',
 'Basket must be nonnegative IDR.':'Nilai belanja dalam rupiah tidak boleh negatif.',
 'Service duration must be 5–600 seconds.':'Waktu pelayanan harus 5–600 detik.',
 'Gross margin must be between 0 and 1.':'Margin kotor harus antara 0 dan 1.',
 'Occupancy cost must be nonnegative.':'Biaya sewa tidak boleh negatif.',
 'Events require a valid time, duration and magnitude.':'Waktu, durasi, dan besaran kejadian harus valid.',
 'Closure must preserve the known reachable concourse route.':'Penutupan harus tetap menyisakan jalur aula yang dapat dilalui.',
 'Campaign target, screen, window and budget must be valid.':'Toko tujuan, layar, waktu, dan anggaran kampanye harus valid.',
 'Trains on the same platform overlap. Allow 75 seconds between train stops.':'Jadwal kereta pada peron yang sama bertumpuk. Beri jarak minimal 75 detik antara keberangkatan satu kereta dan kedatangan berikutnya, atau pilih peron lain.'
};
const labels:Record<string,string>={
 Scenario:'Rencana','Scenario ID':'ID rencana','Scenario name':'Nama rencana',Seed:'Nilai acak simulasi',Tenants:'Daftar toko',Events:'Daftar kejadian',Campaigns:'Daftar kampanye',Event:'Kejadian',Campaign:'Kampanye',
 'Tenant ID':'ID toko','Tenant name':'Nama toko','Tenant category':'Kategori toko','Tenant size':'Ukuran toko','Tenant unit ID':'ID unit toko','Tenant staff':'Jumlah staf toko','Tenant rotation':'Rotasi toko','Tenant open time':'Waktu buka toko','Tenant close time':'Waktu tutup toko','Tenant preparation':'Faktor persiapan toko','Tenant basket':'Nilai belanja toko','Tenant service time':'Waktu pelayanan toko','Tenant margin':'Margin toko','Tenant occupancy cost per day':'Biaya sewa toko per hari',
 'Event ID':'ID kejadian','Event type':'Jenis kejadian','Event start':'Waktu mulai kejadian','Event duration':'Durasi kejadian','Event target':'ID tujuan kejadian','arrival magnitude':'Jumlah penumpang tambahan','delay magnitude':'Lama keterlambatan','rain magnitude':'Intensitas hujan','closure magnitude':'Nilai penutupan','staff magnitude':'Perubahan jumlah staf',
 'Campaign ID':'ID kampanye','Campaign name':'Nama kampanye','Campaign objective':'Tujuan kampanye','Campaign screen ID':'ID layar kampanye','Campaign tenant ID':'ID toko kampanye','Campaign start':'Waktu mulai kampanye','Campaign end':'Waktu selesai kampanye','Campaign budget':'Anggaran kampanye',Staff:'Jumlah staf'
};
function label(value:string):string {
 return labels[value]??value.replace(/^Tenant (\d+)$/,'Toko $1').replace(/^Event (\d+)$/,'Kejadian $1').replace(/^Campaign (\d+)$/,'Kampanye $1');
}
function translate(message:string):string {
 if(exact[message])return exact[message];
 const readPrefix='Saved plans could not be read. Your current plan is unchanged. ';
 const savePrefix='The plan could not be saved. Keep this session open and export JSON, or allow browser storage. ';
 if(message.startsWith(readPrefix))return `Rencana tersimpan tidak dapat dibaca. Rencana aktif tetap utuh. ${translate(message.slice(readPrefix.length))}`;
 if(message.startsWith(savePrefix))return `Rencana belum tersimpan. Tetap buka sesi ini dan ekspor JSON, atau izinkan penyimpanan browser. ${translate(message.slice(savePrefix.length))}`;
 let match=message.match(/^Tenant (.+): (.+)$/);
 if(match)return `Toko ${match[1]}: ${translate(match[2])}`;
 match=message.match(/^Tenant (.+) has an invalid unit\/category\.$/);
 if(match)return `Toko ${match[1]} memiliki unit atau kategori yang tidak valid.`;
 match=message.match(/^(.+) must be (an integer|a finite number) between (-?\d+(?:\.\d+)?) and (-?\d+(?:\.\d+)?)\.$/);
 if(match)return `${label(match[1])} harus berupa ${match[2]==='an integer'?'bilangan bulat':'angka yang valid'} antara ${match[3]} dan ${match[4]}.`;
 match=message.match(/^(.+) must be non-empty text of at most (\d+) characters\.$/);
 if(match)return `${label(match[1])} harus diisi dan tidak boleh melebihi ${match[2]} karakter.`;
 match=message.match(/^(.+) contains unsupported ID characters\.$/);
 if(match)return `${label(match[1])} hanya boleh berisi huruf, angka, garis bawah, atau tanda hubung.`;
 match=message.match(/^(.+) must be an array containing at most (\d+) items\.$/);
 if(match)return `${label(match[1])} harus berupa daftar dengan maksimal ${match[2]} item.`;
 match=message.match(/^(.+) must be an object\.$/);
 if(match)return `${label(match[1])} harus berupa objek data yang valid.`;
 match=message.match(/^(.+) IDs must be unique\.$/);
 if(match)return `Setiap ${label(match[1]).toLowerCase()} harus memiliki ID yang berbeda.`;
 match=message.match(/^Saved plans must contain at most (\d+) plans\.$/);
 if(match)return `Maksimal ${match[1]} rencana dapat disimpan.`;
 if(/quota|exceed.*storage|storage.*full/i.test(message))return 'Penyimpanan browser penuh. Ekspor rencana ke JSON atau hapus rencana yang tidak diperlukan.';
 if(/JSON|Unexpected token|Unexpected end|Expected property|unterminated/i.test(message))return 'Berkas JSON tidak valid. Pilih berkas rencana Lintara yang lengkap.';
 if(/SecurityError|denied|permission|storage|access/i.test(message))return 'Akses penyimpanan browser ditolak. Izinkan penyimpanan atau ekspor rencana ke JSON.';
 return 'Tindakan belum dapat diselesaikan. Periksa pengaturan, lalu coba lagi.';
}
/** Keeps original English diagnostics, but never appends untranslated browser errors in Indonesian. */
export function translateError(lang:Language,error:unknown):string {
 const message=error instanceof Error?error.message:typeof error==='string'?error:'Unable to complete this action.';
 return lang==='id'?translate(error instanceof SyntaxError?'Invalid JSON':message):message;
}
