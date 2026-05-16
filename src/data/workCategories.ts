import { WorkCategoryDef } from '../types';

export const WORK_CATEGORIES: WorkCategoryDef[] = [
  {
    id: 'demolition',
    name: 'הריסה ופינוי',
    items: [
      { id: 'demo_floor',    categoryId: 'demolition', name: 'פירוק ריצוף',       defaultUnit: 'sqm',      defaultPriceKey: 'פירוק ריצוף',       costType: 'labor' },
      { id: 'demo_kitchen',  categoryId: 'demolition', name: 'פירוק מטבח',        defaultUnit: 'unit',     defaultPriceKey: 'פירוק מטבח',        costType: 'labor' },
      { id: 'demo_bath',     categoryId: 'demolition', name: 'פירוק חדר רחצה',    defaultUnit: 'unit',     defaultPriceKey: 'פירוק חדר רחצה',    costType: 'labor' },
      { id: 'demo_walls',    categoryId: 'demolition', name: 'שבירת קירות',       defaultUnit: 'unit',     defaultPriceKey: 'שבירת קירות',       costType: 'labor' },
      { id: 'demo_waste',    categoryId: 'demolition', name: 'פינוי פסולת',       defaultUnit: 'complete', defaultPriceKey: 'פינוי פסולת',       costType: 'labor' },
      { id: 'demo_container',categoryId: 'demolition', name: 'מכולה',             defaultUnit: 'unit',     defaultPriceKey: 'מכולה',             costType: 'labor' },
      { id: 'demo_clean',    categoryId: 'demolition', name: 'ניקוי אתר',         defaultUnit: 'complete', defaultPriceKey: 'ניקוי אתר',         costType: 'labor' },
    ],
  },
  {
    id: 'flooring',
    name: 'ריצוף וחיפוי',
    items: [
      { id: 'floor_work',    categoryId: 'flooring', name: 'ריצוף כללי (עבודה)',   defaultUnit: 'sqm',    defaultPriceKey: 'ריצוף עבודה',   costType: 'labor' },
      { id: 'floor_mat',     categoryId: 'flooring', name: 'ריצוף כללי (חומר)',    defaultUnit: 'sqm',    defaultPriceKey: 'ריצוף חומר',    costType: 'material' },
      { id: 'floor_glue',    categoryId: 'flooring', name: 'הדבקת ריצוף',         defaultUnit: 'sqm',    defaultPriceKey: 'ריצוף עבודה',   costType: 'labor' },
      { id: 'floor_remove',  categoryId: 'flooring', name: 'פירוק ריצוף קיים',    defaultUnit: 'sqm',    defaultPriceKey: 'פירוק ריצוף',   costType: 'labor' },
      { id: 'floor_panels',  categoryId: 'flooring', name: 'פנלים',               defaultUnit: 'meter',  defaultPriceKey: 'פנלים',         costType: 'mixed' },
      { id: 'floor_wall',    categoryId: 'flooring', name: 'חיפוי קירות',         defaultUnit: 'sqm',    defaultPriceKey: 'חיפוי קירות',   costType: 'mixed' },
      { id: 'floor_stairs',  categoryId: 'flooring', name: 'מדרגות',              defaultUnit: 'unit',   defaultPriceKey: 'מדרגות',        costType: 'mixed' },
      { id: 'floor_grout',   categoryId: 'flooring', name: 'רובה',                defaultUnit: 'sqm',    defaultPriceKey: 'רובה',          costType: 'mixed' },
      { id: 'floor_level',   categoryId: 'flooring', name: 'יישור רצפה',          defaultUnit: 'sqm',    defaultPriceKey: 'יישור רצפה',    costType: 'labor' },
    ],
  },
  {
    id: 'painting',
    name: 'צבע ושפכטל',
    items: [
      { id: 'paint_general', categoryId: 'painting', name: 'צבע כללי',           defaultUnit: 'sqm', defaultPriceKey: 'צבע כללי',        costType: 'mixed' },
      { id: 'paint_spackle', categoryId: 'painting', name: 'שפכטל אמריקאי',      defaultUnit: 'sqm', defaultPriceKey: 'שפכטל אמריקאי',   costType: 'mixed' },
      { id: 'paint_plaster', categoryId: 'painting', name: 'תיקוני טיח',         defaultUnit: 'sqm', defaultPriceKey: 'תיקוני טיח',      costType: 'mixed' },
      { id: 'paint_ceiling', categoryId: 'painting', name: 'צבע תקרה',           defaultUnit: 'sqm', defaultPriceKey: 'צבע תקרה',        costType: 'mixed' },
      { id: 'paint_doors',   categoryId: 'painting', name: 'צבע דלתות',          defaultUnit: 'unit', defaultPriceKey: 'צבע דלתות',      costType: 'mixed' },
      { id: 'paint_exterior',categoryId: 'painting', name: 'צבע חוץ',            defaultUnit: 'sqm', defaultPriceKey: 'צבע חוץ',         costType: 'mixed' },
      { id: 'paint_damp',    categoryId: 'painting', name: 'טיפול ברטיבות',      defaultUnit: 'sqm', defaultPriceKey: 'טיפול ברטיבות',   costType: 'mixed' },
    ],
  },
  {
    id: 'drywall',
    name: 'גבס ותקרות',
    items: [
      { id: 'dry_walls',     categoryId: 'drywall', name: 'קירות גבס',            defaultUnit: 'sqm', defaultPriceKey: 'קיר גבס',         costType: 'mixed' },
      { id: 'dry_ceiling',   categoryId: 'drywall', name: 'תקרות גבס',            defaultUnit: 'sqm', defaultPriceKey: 'תקרת גבס',        costType: 'mixed' },
      { id: 'dry_lower',     categoryId: 'drywall', name: 'הנמכת תקרה',           defaultUnit: 'sqm', defaultPriceKey: 'הנמכת תקרה',      costType: 'mixed' },
      { id: 'dry_cornice',   categoryId: 'drywall', name: 'קרניזים',             defaultUnit: 'meter', defaultPriceKey: 'קרניזים',        costType: 'mixed' },
      { id: 'dry_niche',     categoryId: 'drywall', name: 'נישות',               defaultUnit: 'unit', defaultPriceKey: 'נישות',           costType: 'mixed' },
      { id: 'dry_acoustic',  categoryId: 'drywall', name: 'בידוד אקוסטי',        defaultUnit: 'sqm', defaultPriceKey: 'בידוד אקוסטי',    costType: 'mixed' },
      { id: 'dry_lights',    categoryId: 'drywall', name: 'פתחים לגופי תאורה',   defaultUnit: 'unit', defaultPriceKey: 'פתחים תאורה',     costType: 'labor' },
    ],
  },
  {
    id: 'electrical',
    name: 'חשמל',
    items: [
      { id: 'elec_point',    categoryId: 'electrical', name: 'נקודת חשמל',        defaultUnit: 'unit', defaultPriceKey: 'נקודת חשמל',      costType: 'mixed' },
      { id: 'elec_light',    categoryId: 'electrical', name: 'נקודת תאורה',       defaultUnit: 'unit', defaultPriceKey: 'נקודת תאורה',     costType: 'mixed' },
      { id: 'elec_power',    categoryId: 'electrical', name: 'נקודת כוח',         defaultUnit: 'unit', defaultPriceKey: 'נקודת כוח',       costType: 'mixed' },
      { id: 'elec_panel',    categoryId: 'electrical', name: 'לוח חשמל',          defaultUnit: 'unit', defaultPriceKey: 'לוח חשמל',        costType: 'mixed' },
      { id: 'elec_3phase',   categoryId: 'electrical', name: 'תלת פאזי',          defaultUnit: 'unit', defaultPriceKey: 'תלת פאזי',        costType: 'mixed' },
      { id: 'elec_comm',     categoryId: 'electrical', name: 'נקודת תקשורת',      defaultUnit: 'unit', defaultPriceKey: 'נקודת תקשורת',    costType: 'mixed' },
      { id: 'elec_tv',       categoryId: 'electrical', name: 'נקודת טלוויזיה',    defaultUnit: 'unit', defaultPriceKey: 'נקודת טלוויזיה',  costType: 'mixed' },
      { id: 'elec_ac_prep',  categoryId: 'electrical', name: 'הכנה למזגן',        defaultUnit: 'unit', defaultPriceKey: 'הכנה למזגן',      costType: 'mixed' },
      { id: 'elec_fixtures', categoryId: 'electrical', name: 'גופי תאורה',        defaultUnit: 'unit', defaultPriceKey: 'גופי תאורה',      costType: 'material' },
    ],
  },
  {
    id: 'plumbing',
    name: 'אינסטלציה',
    items: [
      { id: 'plumb_water',   categoryId: 'plumbing', name: 'נקודת מים',           defaultUnit: 'unit', defaultPriceKey: 'נקודת מים',      costType: 'mixed' },
      { id: 'plumb_drain',   categoryId: 'plumbing', name: 'נקודת ניקוז',         defaultUnit: 'unit', defaultPriceKey: 'נקודת ניקוז',    costType: 'mixed' },
      { id: 'plumb_toilet',  categoryId: 'plumbing', name: 'אסלה',               defaultUnit: 'unit', defaultPriceKey: 'אסלה',           costType: 'mixed' },
      { id: 'plumb_sink',    categoryId: 'plumbing', name: 'כיור',               defaultUnit: 'unit', defaultPriceKey: 'כיור',           costType: 'mixed' },
      { id: 'plumb_shower',  categoryId: 'plumbing', name: 'מקלחון',             defaultUnit: 'unit', defaultPriceKey: 'מקלחון',         costType: 'mixed' },
      { id: 'plumb_bath',    categoryId: 'plumbing', name: 'אמבטיה',             defaultUnit: 'unit', defaultPriceKey: 'אמבטיה',         costType: 'mixed' },
      { id: 'plumb_boiler',  categoryId: 'plumbing', name: 'דוד מים',            defaultUnit: 'unit', defaultPriceKey: 'דוד מים',        costType: 'mixed' },
      { id: 'plumb_pipe',    categoryId: 'plumbing', name: 'הזזת צנרת',          defaultUnit: 'unit', defaultPriceKey: 'הזזת צנרת',      costType: 'labor' },
      { id: 'plumb_dish',    categoryId: 'plumbing', name: 'הכנה למדיח',         defaultUnit: 'unit', defaultPriceKey: 'הכנה למדיח',     costType: 'labor' },
      { id: 'plumb_wash',    categoryId: 'plumbing', name: 'הכנה למכונת כביסה',  defaultUnit: 'unit', defaultPriceKey: 'הכנה לכביסה',    costType: 'labor' },
    ],
  },
  {
    id: 'kitchen',
    name: 'מטבח',
    items: [
      { id: 'kitch_demo',    categoryId: 'kitchen', name: 'פירוק מטבח',          defaultUnit: 'unit',     defaultPriceKey: 'פירוק מטבח',       costType: 'labor' },
      { id: 'kitch_cabinets',categoryId: 'kitchen', name: 'ארונות מטבח',         defaultUnit: 'complete', defaultPriceKey: 'ארונות מטבח',      costType: 'mixed' },
      { id: 'kitch_marble',  categoryId: 'kitchen', name: 'שיש',                defaultUnit: 'meter',    defaultPriceKey: 'שיש',              costType: 'mixed' },
      { id: 'kitch_sink',    categoryId: 'kitchen', name: 'כיור מטבח',           defaultUnit: 'unit',     defaultPriceKey: 'כיור מטבח',        costType: 'mixed' },
      { id: 'kitch_tap',     categoryId: 'kitchen', name: 'ברז',                defaultUnit: 'unit',     defaultPriceKey: 'ברז',              costType: 'mixed' },
      { id: 'kitch_tiles',   categoryId: 'kitchen', name: 'חיפוי מטבח',         defaultUnit: 'sqm',      defaultPriceKey: 'חיפוי קירות',      costType: 'mixed' },
      { id: 'kitch_elec',    categoryId: 'kitchen', name: 'נקודות חשמל במטבח',  defaultUnit: 'unit',     defaultPriceKey: 'נקודת חשמל',       costType: 'mixed' },
      { id: 'kitch_install', categoryId: 'kitchen', name: 'התקנת מוצרי חשמל',  defaultUnit: 'unit',     defaultPriceKey: 'התקנת מוצרי חשמל', costType: 'labor' },
    ],
  },
  {
    id: 'bathroom',
    name: 'חדרי רחצה',
    items: [
      { id: 'bath_full',     categoryId: 'bathroom', name: 'שיפוץ חדר רחצה קומפלט', defaultUnit: 'unit', defaultPriceKey: 'שיפוץ חדר רחצה קומפלט', costType: 'mixed' },
      { id: 'bath_seal',     categoryId: 'bathroom', name: 'איטום',              defaultUnit: 'sqm',  defaultPriceKey: 'איטום',             costType: 'mixed' },
      { id: 'bath_floor',    categoryId: 'bathroom', name: 'ריצוף',             defaultUnit: 'sqm',  defaultPriceKey: 'ריצוף עבודה',       costType: 'mixed' },
      { id: 'bath_wall',     categoryId: 'bathroom', name: 'חיפוי',             defaultUnit: 'sqm',  defaultPriceKey: 'חיפוי קירות',       costType: 'mixed' },
      { id: 'bath_sanitary', categoryId: 'bathroom', name: 'כלים סניטריים',     defaultUnit: 'complete', defaultPriceKey: 'כלים סניטריים', costType: 'material' },
      { id: 'bath_shower',   categoryId: 'bathroom', name: 'מקלחון',            defaultUnit: 'unit', defaultPriceKey: 'מקלחון',            costType: 'mixed' },
      { id: 'bath_cabinet',  categoryId: 'bathroom', name: 'ארון אמבטיה',       defaultUnit: 'unit', defaultPriceKey: 'ארון אמבטיה',       costType: 'mixed' },
      { id: 'bath_drain',    categoryId: 'bathroom', name: 'ניקוז',             defaultUnit: 'unit', defaultPriceKey: 'נקודת ניקוז',       costType: 'labor' },
      { id: 'bath_intercom', categoryId: 'bathroom', name: 'אינטרפוץ',          defaultUnit: 'unit', defaultPriceKey: 'אינטרפוץ',          costType: 'mixed' },
    ],
  },
  {
    id: 'aluminum',
    name: 'אלומיניום וחלונות',
    items: [
      { id: 'alum_window',   categoryId: 'aluminum', name: 'חלון',              defaultUnit: 'unit', defaultPriceKey: 'חלון אלומיניום',    costType: 'mixed' },
      { id: 'alum_shutter',  categoryId: 'aluminum', name: 'תריס',              defaultUnit: 'unit', defaultPriceKey: 'תריס',              costType: 'mixed' },
      { id: 'alum_screen',   categoryId: 'aluminum', name: 'רשת',              defaultUnit: 'unit', defaultPriceKey: 'רשת',               costType: 'mixed' },
      { id: 'alum_vitrine',  categoryId: 'aluminum', name: 'ויטרינה',           defaultUnit: 'sqm',  defaultPriceKey: 'ויטרינה',           costType: 'mixed' },
      { id: 'alum_repair',   categoryId: 'aluminum', name: 'תיקון אלומיניום',   defaultUnit: 'unit', defaultPriceKey: 'תיקון אלומיניום',   costType: 'labor' },
      { id: 'alum_glass',    categoryId: 'aluminum', name: 'החלפת זכוכית',      defaultUnit: 'unit', defaultPriceKey: 'החלפת זכוכית',      costType: 'mixed' },
    ],
  },
  {
    id: 'carpentry',
    name: 'דלתות ונגרות',
    items: [
      { id: 'carp_inner',    categoryId: 'carpentry', name: 'דלת פנים',         defaultUnit: 'unit', defaultPriceKey: 'דלת פנים',          costType: 'mixed' },
      { id: 'carp_entry',    categoryId: 'carpentry', name: 'דלת כניסה',        defaultUnit: 'unit', defaultPriceKey: 'דלת כניסה',         costType: 'mixed' },
      { id: 'carp_frame',    categoryId: 'carpentry', name: 'משקוף',            defaultUnit: 'unit', defaultPriceKey: 'משקוף',             costType: 'mixed' },
      { id: 'carp_closet',   categoryId: 'carpentry', name: 'ארון קיר',         defaultUnit: 'unit', defaultPriceKey: 'ארון קיר',          costType: 'mixed' },
      { id: 'carp_custom',   categoryId: 'carpentry', name: 'עבודת נגרות מותאמת', defaultUnit: 'work_day', defaultPriceKey: 'עבודת נגרות', costType: 'labor' },
      { id: 'carp_shelves',  categoryId: 'carpentry', name: 'מדפים',            defaultUnit: 'unit', defaultPriceKey: 'מדפים',             costType: 'mixed' },
    ],
  },
  {
    id: 'ac',
    name: 'מיזוג',
    items: [
      { id: 'ac_split',      categoryId: 'ac', name: 'מזגן עילי',              defaultUnit: 'unit',  defaultPriceKey: 'מזגן עילי',          costType: 'mixed' },
      { id: 'ac_mini',       categoryId: 'ac', name: 'מזגן מיני מרכזי',        defaultUnit: 'unit',  defaultPriceKey: 'מיני מרכזי',         costType: 'mixed' },
      { id: 'ac_drain',      categoryId: 'ac', name: 'נקודת ניקוז למזגן',      defaultUnit: 'unit',  defaultPriceKey: 'נקודת ניקוז למזגן', costType: 'labor' },
      { id: 'ac_pipe',       categoryId: 'ac', name: 'צנרת',                  defaultUnit: 'meter', defaultPriceKey: 'צנרת מזגן',          costType: 'mixed' },
      { id: 'ac_grill',      categoryId: 'ac', name: 'גריל',                  defaultUnit: 'unit',  defaultPriceKey: 'גריל מזגן',          costType: 'mixed' },
      { id: 'ac_dry',        categoryId: 'ac', name: 'הנמכת גבס למיזוג',       defaultUnit: 'sqm',   defaultPriceKey: 'תקרת גבס',           costType: 'mixed' },
    ],
  },
  {
    id: 'garden',
    name: 'גינה וחוץ',
    items: [
      { id: 'gard_deck',     categoryId: 'garden', name: 'דק',                 defaultUnit: 'sqm',   defaultPriceKey: 'דק',                costType: 'mixed' },
      { id: 'gard_pergola',  categoryId: 'garden', name: 'פרגולה',             defaultUnit: 'sqm',   defaultPriceKey: 'פרגולה',            costType: 'mixed' },
      { id: 'gard_grass',    categoryId: 'garden', name: 'דשא סינטטי',         defaultUnit: 'sqm',   defaultPriceKey: 'דשא סינטטי',        costType: 'mixed' },
      { id: 'gard_paving',   categoryId: 'garden', name: 'ריצוף חוץ',          defaultUnit: 'sqm',   defaultPriceKey: 'ריצוף חוץ',         costType: 'mixed' },
      { id: 'gard_lights',   categoryId: 'garden', name: 'תאורת גינה',         defaultUnit: 'unit',  defaultPriceKey: 'תאורת גינה',        costType: 'mixed' },
      { id: 'gard_irrig',    categoryId: 'garden', name: 'השקיה',              defaultUnit: 'sqm',   defaultPriceKey: 'השקיה',             costType: 'mixed' },
      { id: 'gard_fence',    categoryId: 'garden', name: 'גדר',               defaultUnit: 'meter', defaultPriceKey: 'גדר',               costType: 'mixed' },
      { id: 'gard_gate',     categoryId: 'garden', name: 'שער',               defaultUnit: 'unit',  defaultPriceKey: 'שער',               costType: 'mixed' },
    ],
  },
];

export function findWorkItem(itemId: string) {
  for (const cat of WORK_CATEGORIES) {
    const found = cat.items.find((i) => i.id === itemId);
    if (found) return found;
  }
  return undefined;
}

export function findCategory(categoryId: string) {
  return WORK_CATEGORIES.find((c) => c.id === categoryId);
}
