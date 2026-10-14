// Небольшие проверки форматов на клиенте: подсказываем пользователю сразу,
// не дожидаясь ответа сервера (на сервере те же правила продублированы).

export function isValidEmail(value) {
  const email = String(value ?? '').trim()

  return /^[^\s@]+@[^\s@]+\.[a-zA-Zа-яА-Я]{2,}$/.test(email)
}

export function phoneDigits(value) {
  return String(value ?? '').replace(/\D/g, '')
}

export function isValidPhone(value) {
  let digits = phoneDigits(value)

  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) {
    digits = digits.slice(1)
  }

  return /^\d{10}$/.test(digits) && digits[0] !== '7' && digits[0] !== '8'
}

export function phoneError(value) {
  if (!String(value ?? '').trim()) {
    return 'Укажите номер телефона.'
  }

  return isValidPhone(value) ? '' : 'Телефон должен содержать 10 цифр, например +7 (912) 345-67-89.'
}

export function emailError(value) {
  if (!String(value ?? '').trim()) {
    return 'Укажите e-mail.'
  }

  return isValidEmail(value) ? '' : 'Укажите корректный e-mail, например mail@example.com.'
}