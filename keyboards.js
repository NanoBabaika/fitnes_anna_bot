const { InlineKeyboard, Keyboard } = require('grammy');

// Главное меню (Reply клавиатура)
const mainMenu = new Keyboard()
  .text('🏋️‍♀️ Направления тренировок')
  .text('🎫 Тренировки с ограниченным кол-вом мест').row()
  .text('💰 Информация об оплате')
  .text('👨‍🏫 Тренерский состав').row()
  .text('📅 Расписание')
  .text('❓ Часто задаваемые вопросы')
  .resized();

// Инлайн клавиатура с тренировками
function getTrainingsKeyboard() {
  return new InlineKeyboard()
    .text('Пилатес', 'btn_pilates')
    .text('Стретчинг', 'btn_stretching').row()
    .text('Степ', 'btn_step')
    .text('Функциональный тренинг', 'btn_functional').row()
    .text('⬅️ Назад в меню', 'back_to_main_menu');
}

// Инлайн клавиатура со спецтренировками (исправленная)
function getSpecialTrainingsKeyboard() {
  return new InlineKeyboard()
    .text('🧠 Умный фитнес', 'btn_special_smart_fitness')
    .text('🔥 Проект "Перезагрузка"', 'btn_special_transformation').row()
    .text('⬅️ Назад в меню', 'back_to_main_menu');
}

// Инлайн клавиатура для детальной страницы спецтренировки
function getSpecialTrainingDetailsKeyboard() {
  return new InlineKeyboard()
    .text('⬅️ Назад к списку', 'back_to_special_list')
    .text('🏠 В главное меню', 'back_to_main_menu');
}

// Инлайн клавиатура с тренерами
function getTrainersKeyboard() {
  return new InlineKeyboard()
    .text('Тренер Ирина', 'btn_trainer_irina')
    .text('Тренер Анна', 'btn_trainer_anna').row()
    .text('⬅️ Назад в меню', 'back_to_main_menu');
}

// Инлайн клавиатура для детальной страницы тренировки
function getTrainingDetailsKeyboard() {
  return new InlineKeyboard()
    .text('⬅️ Назад к списку', 'back_to_trainings_list')
    .text('🏠 В главное меню', 'back_to_main_menu');
}

// Инлайн клавиатура для детальной страницы тренера
function getTrainerDetailsKeyboard() {
  return new InlineKeyboard()
    .text('⬅️ Назад к списку', 'back_to_trainers_list')
    .text('🏠 В главное меню', 'back_to_main_menu');
}

// Инлайн клавиатура для расписания
function getScheduleKeyboard() {
  return new InlineKeyboard()
    .text('🔄 Обновить', 'refresh_schedule')
    .text('🏠 В главное меню', 'back_to_main_menu');
}

// Экспортируем все клавиатуры
module.exports = {
  mainMenu,
  getTrainingsKeyboard,
  getSpecialTrainingsKeyboard,
  getSpecialTrainingDetailsKeyboard,
  getTrainersKeyboard,
  getTrainingDetailsKeyboard,
  getTrainerDetailsKeyboard,
  getScheduleKeyboard
};

// // Экспортируем все клавиатуры
// module.exports = {
//   mainMenu,
//   getTrainingsKeyboard,
//   getSpecialTrainingsKeyboard,
//   getSpecialTrainingDetailsKeyboard,
//   getTrainersKeyboard,
//   getTrainingDetailsKeyboard,
//   getTrainerDetailsKeyboard,
//   getScheduleKeyboard
// };