// Default Telegram post templates (shared by the formatter and settings).
// Lines whose placeholders are all empty are dropped at render time.
//
// {link} and {cta} remain available for custom templates. The defaults keep
// one clear action in the inline keyboard and avoid a second promotional CTA.
export const DEFAULT_TEMPLATES = {
  en:
    '\u{1F4DA} <b>{title}</b>\n\n' +
    '\u{1F464} <b>Instructor:</b> {instructor}\n' +
    '⭐ <b>Rating:</b> {rating}\n' +
    '\u{1F465} <b>Students:</b> {students_count}\n' +
    '\u{1F4B0} <b>Regular price:</b> {original_price}\n' +
    '\u{1F30D} <b>Language:</b> {language}\n' +
    '⏱️ <b>Duration:</b> {duration}\n\n' +
    '✅ 100% coupon — limited time\n' +
    '⚠️ Confirm the final price is 0 on Udemy before enrolling.',
  ar:
    '\u{1F4DA} <b>{title}</b>\n\n' +
    '\u{1F464} <b>المدرب:</b> {instructor}\n' +
    '⭐ <b>التقييم:</b> {rating}\n' +
    '\u{1F465} <b>الطلاب:</b> {students_count}\n' +
    '\u{1F4B0} <b>السعر المعتاد:</b> {original_price}\n' +
    '\u{1F30D} <b>اللغة:</b> {language}\n' +
    '⏱️ <b>المدة:</b> {duration}\n\n' +
    '✅ كوبون 100% — لفترة محدودة\n' +
    '⚠️ تأكد أن السعر النهائي على يودمي هو 0 قبل التسجيل.',
}
