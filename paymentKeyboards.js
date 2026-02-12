const { InlineKeyboard } = require('grammy');

// Клавиатура для приветственного сообщения
function getWelcomeKeyboard() {
  return new InlineKeyboard()
    .text('▶️ Посмотреть инструкцию', 'payment_next_welcome')
    .text('🏠 В меню', 'back_to_main_menu');
}

// Клавиатура для шагов 1-3
function getStepKeyboard(step, showBack = true) {
  const keyboard = new InlineKeyboard();
  
  if (showBack) {
    keyboard.text('◀️ Назад', `payment_back_${step}`);
  }
  
  keyboard.text('▶️ Далее', `payment_next_${step}`);
  
  if (step === 1) {
    keyboard.row();
    keyboard.text('🏠 В меню', 'back_to_main_menu');
  }
  
  return keyboard;
}

// Клавиатура для последнего шага (4)
function getFinalStepKeyboard() {
  return new InlineKeyboard()
    .text('✅ Я оплатил', 'payment_paid')
    .text('◀️ Назад', 'payment_back_4').row()
    .text('🏠 В меню', 'back_to_main_menu');
}

// Клавиатура для ожидания чека
function getWaitingForReceiptKeyboard() {
  return new InlineKeyboard()
    .text('❌ Отменить отправку', 'payment_cancel_receipt')
    .text('🏠 В меню', 'back_to_main_menu');
}

module.exports = {
  getWelcomeKeyboard,
  getStepKeyboard,
  getFinalStepKeyboard,
  getWaitingForReceiptKeyboard
};