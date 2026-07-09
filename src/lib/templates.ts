// Default Telegram post templates (shared by the formatter and settings).
// Lines whose placeholders are all empty are dropped at render time.
//
// {cta} is rendered by the formatter as an HTML anchor (blue, tappable text):
//   {cta} → "Add the automatic courses service to your channel/group"
//           → opens the contact bot
//
// {link} is intentionally NOT in the default template: the course link is
// already delivered as an inline "🚀 Enroll Free" button below the message,
// so a second clickable line in the body would be redundant.
export const DEFAULT_TEMPLATES = {
  en:
    '\u{1F4DA} <b>{title}</b>\n\n' +
    '\u{1F464} <b>Instructor:</b> {instructor}\n' +
    '⭐ <b>Rating:</b> {rating}\n' +
    '\u{1F465} <b>Students:</b> {students_count}\n' +
    '\u{1F4B0} <b>Price:</b> {original_price} → Free\n' +
    '\u{1F30D} <b>Language:</b> {language}\n' +
    '⏱️ <b>Duration:</b> {duration}\n\n' +
    '✅ Free coupon — limited time\n' +
    '➕ {cta}',
  ar:
    '\u{1F4DA} <b>{title}</b>\n\n' +
    '\u{1F464} <b>المدرب:</b> {instructor}\n' +
    '⭐ <b>التقييم:</b> {rating}\n' +
    '\u{1F465} <b>الطلاب:</b> {students_count}\n' +
    '\u{1F4B0} <b>السعر:</b> {original_price} → مجاناً\n' +
    '\u{1F30D} <b>اللغة:</b> {language}\n' +
    '⏱️ <b>المدة:</b> {duration}\n\n' +
    '✅ كوبون مجاني — لفترة محدودة\n' +
    '➕ {cta}',
};
