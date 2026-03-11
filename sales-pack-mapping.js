/**
 * Sales pack asset mapping from CSV.
 * Original Spec Section, User Selection (Trigger), Proposed PDF Filename
 */
window.SALES_PACK_MAPPING = [
  { section: 'Front Cover', trigger: 'Always', filename: '01_Cover_Dynamic.pdf' },
  { section: 'Option 1', trigger: 'Yes', filename: '02_Company_Info.pdf' },
  { section: 'Option 2', trigger: 'Residential', filename: '03_Sector_Resi.pdf' },
  { section: 'Option 2', trigger: 'Commercial', filename: '03_Sector_Comm.pdf' },
  { section: 'Option 2', trigger: 'Hotel', filename: '03_Sector_Hotel.pdf' },
  { section: 'Option 3', trigger: 'RAK8', filename: '04_HW_RAK8.pdf' },
  { section: 'Option 3', trigger: 'DIN', filename: '04_HW_DIN.pdf' },
  { section: 'Option 3', trigger: 'Wireless', filename: '04_HW_Wireless.pdf' },
  { section: 'Option 4', trigger: 'ALL Options', filename: '05_KP_All.pdf' },
  { section: 'Option 4', trigger: 'MOD', filename: '05_KP_MOD.pdf' },
  { section: 'Option 4', trigger: 'EOS', filename: '05_KP_EOS.pdf' },
  { section: 'Option 4', trigger: 'CLASSIC', filename: '05_KP_Classic.pdf' },
  { section: 'Option 4', trigger: '3RD PARTY', filename: '05_KP_3rdParty.pdf' },
  { section: 'Option 5', trigger: 'Homeowner', filename: '06_App_Home.pdf' },
  { section: 'Option 5', trigger: 'Professional', filename: '06_App_Pro.pdf' },
  { section: 'Option 6', trigger: 'Integration', filename: '07_Add_Integration.pdf' },
  { section: 'Option 6', trigger: 'Supp. Products', filename: '07_Add_Supp.pdf' },
  { section: 'Quote Page', trigger: 'Always', filename: '08_Quote_Dynamic.pdf' },
  { section: 'T&Cs', trigger: 'Always', filename: '09_Terms_Conditions.pdf' },
  { section: 'Closing Page', trigger: 'Always', filename: '10_Closing_Aspirational.pdf' }
];

/**
 * options: { option1: true, option2: 'Residential'|'Commercial'|'Hotel', option3: 'RAK8'|'DIN'|'Wireless',
 *            option4: 'ALL Options'|'MOD'|..., option5: 'Homeowner'|'Professional', option6: 'Integration'|'Supp. Products' or array of both }
 */
function getDefaultOrderedFilenames(options) {
  var list = [];
  var map = window.SALES_PACK_MAPPING || [];
  var seen = Object.create(null);
  options = options || {};

  function add(filename) {
    if (!filename || seen[filename]) return;
    seen[filename] = true;
    list.push(filename);
  }

  function matchOpt6(trigger) {
    var o6 = options.option6;
    if (!o6) return false;
    if (Array.isArray(o6)) return o6.indexOf(trigger) !== -1;
    return o6 === trigger;
  }

  map.forEach(function (row) {
    if (row.trigger === 'Always') {
      add(row.filename);
      return;
    }
    if (row.section === 'Option 1' && options.option1) add(row.filename);
    if (row.section === 'Option 2' && row.trigger === options.option2) add(row.filename);
    if (row.section === 'Option 3' && row.trigger === options.option3) add(row.filename);
    if (row.section === 'Option 4' && row.trigger === options.option4) add(row.filename);
    if (row.section === 'Option 5' && row.trigger === options.option5) add(row.filename);
    if (row.section === 'Option 6' && matchOpt6(row.trigger)) add(row.filename);
  });

  list.sort(function (a, b) {
    var na = parseInt((a.match(/^\d+/) || [0])[0], 10);
    var nb = parseInt((b.match(/^\d+/) || [0])[0], 10);
    return na - nb;
  });
  return list;
}

window.getDefaultOrderedFilenames = getDefaultOrderedFilenames;
