require('dotenv').config();

const { Bot, GrammyError, HttpError, InputFile } = require('grammy');
const { 
  mainMenu, 
  getTrainingsKeyboard, 
  getSpecialTrainingsKeyboard,
  getTrainersKeyboard,
  getTrainingDetailsKeyboard,
  getSpecialTrainingDetailsKeyboard,
  getTrainerDetailsKeyboard,
  getScheduleKeyboard
} = require('./keyboards');

const {
  getWelcomeKeyboard,
  getStepKeyboard,
  getFinalStepKeyboard,
  getWaitingForReceiptKeyboard
} = require('./paymentKeyboards');

const trainingData = require('./trainingData');
const trainersData = require('./trainersData');
const specialTrainingsData = require('./specialTrainingsData');
const paymentSteps = require('./paymentData');
const ScheduleManager = require('./scheduleManager');

const bot = new Bot(process.env.BOT_API_KEY);
const scheduleManager = new ScheduleManager();

const ADMIN_CHAT_ID = process.env.ADMIN_ID;

// Хранилище состояний пользователей для оплаты
const userPaymentState = {};

// ==================== КОНСТАНТЫ ====================
const FAQ_TEXT = 
  '❓ *Часто задаваемые вопросы*\n\n' +
  
  '📍 *Как нас найти? Какой адрес студии?*\n' +
  'Наша студия расположена по адресу: станица Каневская, улица Вокзальная 42а, второй этаж (помещение над магазином "Магнит").\n\n' +
  
  '📱 *Как с вами связаться?*\n' +
  'По всем вопросам вы можете обратиться к администратору студии:\n' +
  '• Телефон: +7 (953) 096-94-27 (Анна)\n' +
  '• Время для звонков: ежедневно с 9:00 до 21:00\n\n' +
  
  '🌐 *Есть ли у вас социальные сети, на которые можно подписаться?*\n' +
  'Да, мы ведем активные сообщества в социальных сетях:\n' +
  '• ВКонтакте: https://vk.ru/life211605211\n' +
  '• Telegram-канал: https://t.me/+bXoDnIQkuWNlMTQy\n\n' +
  'В наших соцсетях вы найдете актуальное расписание, фотографии с тренировок, полезные советы по фитнесу и информацию о специальных предложениях.\n\n' +
  
  '👕 *Какую одежду необходимо брать с собой на тренировку?*\n' +
  'Для занятий в нашей студии требуется:\n' +
  '• Удобная спортивная форма\n' +
  '• Сменная спортивная обувь (требуется для степ-аэробики, функционального тренинга и проекта "Перезагрузка")\n' +
  '• Носки (достаточно для пилатеса, умного фитнеса и стретчинга)\n' +
  '• Рекомендуем также иметь при себе бутылку воды и полотенце\n\n' +
  
  '🏃‍♀️ *На какие тренировки вы рекомендуете записаться новичкам?*\n' +
  'Для начинающих мы рекомендуем следующие направления:\n' +
  '• Пилатес – для развития гибкости и укрепления мышц\n' +
  '• Стретчинг – для повышения эластичности мышц и улучшения осанки\n' +
  '• Умный фитнес – индивидуальный подход с учетом вашего уровня подготовки\n\n' +
  'Все тренировки адаптируются под ваш уровень, а на первом занятии тренер проведет подробный инструктаж.\n\n' +
  
  '⚕️ *Если есть медицинские противопоказания, стоит ли заниматься?*\n' +
  'При наличии серьезных заболеваний или хронических состояний мы настоятельно рекомендуем предварительно проконсультироваться с лечащим врачом. \n\n' +
  'Наши тренеры имеют образование в области реабилитационного фитнеса и могут адаптировать упражнения, но окончательное решение о возможности тренировок принимает медицинский специалист.\n\n' +
  
  '📝 *Как записаться на занятие?*\n' +
  'Запись осуществляется несколькими способами:\n' +
  '1. По телефону у администратора\n' +
  '2. Через бота в разделе "Расписание"\n' +
  '3. Написав нам в социальных сетях\n\n' +
  
  '💳 *Какие варианты оплаты тренировок доступны?*\n' +
  'Мы предлагаем:\n' +
  '• Разовые посещения (400 рублей)\n' +
  '• Абонементы на 8-12 занятий (от 2500 рублей)\n' +
  '• Специальные программы (стоимость уточняйте у администратора)\n\n' +
  
  'Для подробной информации об оплате воспользуйтесь разделом "💰 Информация об оплате" в главном меню.\n\n' +
  
  'ℹ️ *Остались вопросы?*\n' +
  'Мы всегда готовы помочь! Свяжитесь с нами по указанным контактам, и мы с радостью ответим на все ваши вопросы.';

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

// Функция для удаления сообщений пользователя
async function deleteUserMessages(ctx, userId) {
  if (userPaymentState[userId] && userPaymentState[userId].messageIds) {
    for (const messageId of userPaymentState[userId].messageIds) {
      try {
        await ctx.api.deleteMessage(userId, messageId);
      } catch (error) {
        console.log(`Не удалось удалить сообщение ${messageId}:`, error.message);
      }
    }
    userPaymentState[userId].messageIds = [];
  }
}

// Функция для отображения главного меню
async function showMainMenu(ctx) {
  await ctx.reply('🏠 *Главное меню*\n\nВыберите раздел:', {
    parse_mode: 'Markdown',
    reply_markup: mainMenu
  });
}

// Функция для показа приветственного сообщения оплаты
async function showPaymentWelcome(ctx) {
  const userId = ctx.from.id;
  const welcomeData = paymentSteps.welcome;
  
  await deleteUserMessages(ctx, userId);
  
  userPaymentState[userId] = {
    currentStep: 'welcome',
    messageIds: [],
    isWaitingForReceipt: false
  };
  
  const message = await ctx.reply(`${welcomeData.title}\n\n${welcomeData.description}`, {
    parse_mode: 'Markdown',
    reply_markup: getWelcomeKeyboard()
  });
  
  userPaymentState[userId].messageIds.push(message.message_id);
}

// Функция для показа шага оплаты
async function showPaymentStep(ctx, stepKey) {
  const userId = ctx.from.id;
  const stepData = paymentSteps[stepKey];
  
  if (!stepData) {
    await ctx.reply('Ошибка: шаг не найден');
    return;
  }
  
  await deleteUserMessages(ctx, userId);
  
  userPaymentState[userId] = {
    currentStep: stepKey,
    messageIds: [],
    isWaitingForReceipt: false
  };
  
  // Сначала отправляем фото
  if (stepData.photos && stepData.photos.length > 0) {
    for (const photoPath of stepData.photos) {
      try {
        const photoMessage = await ctx.replyWithPhoto(new InputFile(photoPath));
        userPaymentState[userId].messageIds.push(photoMessage.message_id);
      } catch (photoError) {
        console.error('Ошибка при отправке фото оплаты:', photoError);
        const errorMessage = await ctx.reply('⚠️ Фото временно недоступно');
        userPaymentState[userId].messageIds.push(errorMessage.message_id);
      }
    }
  }
  
  // Затем описание
  const message = await ctx.reply(`${stepData.title}\n\n${stepData.description}`, {
    parse_mode: 'Markdown',
    reply_markup: stepKey === 'step4' ? getFinalStepKeyboard() : getStepKeyboard(stepKey, stepKey !== 'step1')
  });
  
  userPaymentState[userId].messageIds.push(message.message_id);
}

// ==================== ФУНКЦИИ ПОКАЗА ДЕТАЛЕЙ (ОПТИМИЗИРОВАНЫ) ====================

async function showTrainingDetails(ctx, trainingKey) {
  const training = trainingData[trainingKey];
  if (!training) {
    await ctx.reply('Информация о тренировке временно недоступна');
    return;
  }

  // Сначала отправляем текст (быстро)
  await ctx.reply(training.description, {
    parse_mode: 'Markdown',
    reply_markup: getTrainingDetailsKeyboard()
  });

  // Затем отправляем фото (если есть) — не задерживает ответ на callback
  if (training.photo) {
    try {
      await ctx.replyWithPhoto(new InputFile(training.photo), {
        caption: training.title
      });
    } catch (error) {
      console.error('Ошибка при отправке фото тренировки:', error);
    }
  }
}

async function showSpecialTrainingDetails(ctx, specialKey) {
  const training = specialTrainingsData[specialKey];
  if (!training) {
    await ctx.reply('Информация о специальной тренировке временно недоступна');
    return;
  }

  // Сначала текст
  await ctx.reply(training.description, {
    parse_mode: 'Markdown',
    reply_markup: getSpecialTrainingDetailsKeyboard()
  });

  // Потом фото
  if (training.photo) {
    try {
      await ctx.replyWithPhoto(new InputFile(training.photo), {
        caption: training.title
      });
    } catch (error) {
      console.error('Ошибка при отправке фото спецтренировки:', error);
    }
  }
}

async function showTrainerDetails(ctx, trainerKey) {
  const trainer = trainersData[trainerKey];
  if (!trainer) {
    await ctx.reply('Информация о тренере временно недоступна');
    return;
  }

  // Сначала текст
  await ctx.reply(`${trainer.title}\n\n${trainer.description}`, {
    parse_mode: 'Markdown',
    reply_markup: getTrainerDetailsKeyboard()
  });

  // Потом фото
  if (trainer.photo) {
    try {
      await ctx.replyWithPhoto(new InputFile(trainer.photo), {
        caption: trainer.name
      });
    } catch (error) {
      console.error('Ошибка при отправке фото тренера:', error);
    }
  }
}

// ==================== КОМАНДЫ ====================

bot.command('start', async (ctx) => {
  await ctx.reply(`👋 Привет, ${ctx.from.first_name}! Добро пожаловать в фитнес-студию "Жизнь".\n\n` +
                  '📌 Для навигации используйте кнопки меню или команды:\n' +
                  '/help - список всех команд\n' +
                  '/menu - главное меню');
  await showMainMenu(ctx);
});

bot.command('help', async (ctx) => {
  try {
    await ctx.reply(
      '📚 *Список команд бота\\:*\n\n' +
      '/start \\- Начать работу с ботом\n' +
      '/menu \\- Показать главное меню\n' +
      '/trainings \\- Показать направления тренировок\n' +
      '/special\\_trainings \\- Тренировки с ограниченным количеством мест\n' +
      '/payment \\- Информация об оплате\n' +
      '/trainers \\- Наши тренеры\n' +
      '/schedule \\- Расписание занятий\n' +
      '/questions \\- Часто задаваемые вопросы\n' +
      '/help \\- Показать этот список команд\n\n' +
      '📍 *Также вы можете использовать кнопки главного меню*',
      { parse_mode: 'MarkdownV2' }
    );
  } catch (error) {
    console.error('Ошибка в команде /help:', error);
    await ctx.reply(
      '📚 Список команд бота:\n\n' +
      '/start - Начать работу с ботом\n' +
      '/menu - Показать главное меню\n' +
      '/trainings - Показать направления тренировок\n' +
      '/special_trainings - Тренировки с ограниченным количеством мест\n' +
      '/payment - Информация об оплате\n' +
      '/trainers - Наши тренеры\n' +
      '/schedule - Расписание занятий\n' +
      '/questions - Часто задаваемые вопросы\n' +
      '/help - Показать этот список команд\n\n' +
      '📍 Также вы можете использовать кнопки главного меню'
    );
  }
});

bot.command('menu', async (ctx) => {
  await showMainMenu(ctx);
});

bot.command('trainings', async (ctx) => {
  await ctx.reply('Выберите тип тренировки:', {
    reply_markup: getTrainingsKeyboard()
  });
});

bot.command('special_trainings', async (ctx) => {
  await ctx.reply('🎫 *Тренировки с ограниченным количеством мест*\n\nВыберите программу:', {
    parse_mode: 'Markdown',
    reply_markup: getSpecialTrainingsKeyboard()
  });
});

bot.command('payment', async (ctx) => {
  await showPaymentWelcome(ctx);
});

bot.command('trainers', async (ctx) => {
  await ctx.reply('👨‍🏫 *Наши тренеры*\n\nВыберите тренера, чтобы узнать больше:', {
    parse_mode: 'Markdown',
    reply_markup: getTrainersKeyboard()
  });
});

bot.command('schedule', async (ctx) => {
  try {
    const scheduleData = await scheduleManager.getSchedule();
    const message = scheduleManager.formatSchedule(scheduleData);
    await ctx.reply(message, { 
      parse_mode: "Markdown",
      reply_markup: getScheduleKeyboard()
    });
  } catch (error) {
    console.error('Ошибка показа расписания:', error);
    await ctx.reply('❌ Не удалось загрузить расписание. Попробуйте позже.');
  }
});

bot.command('questions', async (ctx) => {
  await ctx.reply(FAQ_TEXT, { parse_mode: 'Markdown' });
});

// ==================== ОБРАБОТЧИК ТЕКСТОВЫХ СООБЩЕНИЙ ====================

bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;
  const userId = ctx.from.id;

  if (userPaymentState[userId] && userPaymentState[userId].isWaitingForReceipt) {
    await ctx.reply('Пожалуйста, отправьте скриншот чека в виде изображения 📸');
    return;
  }

  switch (text) {
    case '🏋️‍♀️ Направления тренировок':
      await ctx.reply('Выберите тип тренировки:', {
        reply_markup: getTrainingsKeyboard()
      });
      break;

    case '🎫 Тренировки с ограниченным кол-вом мест':
      await ctx.reply('🎫 *Тренировки с ограниченным количеством мест*\n\nВыберите программу:', {
        parse_mode: 'Markdown',
        reply_markup: getSpecialTrainingsKeyboard()
      });
      break;

    case '💰 Информация об оплате':
      await showPaymentWelcome(ctx);
      break;

    case '👨‍🏫 Тренерский состав':
      await ctx.reply('👨‍🏫 *Наши тренеры*\n\nВыберите тренера, чтобы узнать больше:', {
        parse_mode: 'Markdown',
        reply_markup: getTrainersKeyboard()
      });
      break;

    case '📅 Расписание':
      try {
        const scheduleData = await scheduleManager.getSchedule();
        const message = scheduleManager.formatSchedule(scheduleData);
        await ctx.reply(message, { 
          parse_mode: "Markdown",
          reply_markup: getScheduleKeyboard()
        });
      } catch (error) {
        console.error('Ошибка показа расписания:', error);
        await ctx.reply('❌ Не удалось загрузить расписание. Попробуйте позже.');
      }
      break;

    case '❓ Часто задаваемые вопросы':
      await ctx.reply(FAQ_TEXT, { parse_mode: 'Markdown' });
      break;

    default:
      await showMainMenu(ctx);
  }
});

// ==================== ОБРАБОТЧИК ФОТО (ЧЕКИ) ====================

bot.on('message:photo', async (ctx) => {
  const userId = ctx.from.id;
  
  if (userPaymentState[userId] && userPaymentState[userId].isWaitingForReceipt) {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    
    try {
      await ctx.api.sendPhoto(
        ADMIN_CHAT_ID,
        photo.file_id,
        {
          caption: `📥 Новый чек от пользователя:\n` +
                  `Имя: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
                  `Username: @${ctx.from.username || 'не указан'}\n` +
                  `ID: ${ctx.from.id}\n` +
                  `Время: ${new Date().toLocaleString('ru-RU')}`
        }
      );
      
      await ctx.reply(paymentSteps.receiptReceived.message);
      delete userPaymentState[userId];
      
    } catch (error) {
      console.error('Ошибка при пересылке чека:', error);
      await ctx.reply('❌ Не удалось отправить чек. Попробуйте позже или свяжитесь с администратором напрямую.');
    }
  }
});

// ==================== ОБРАБОТЧИК CALLBACK-ЗАПРОСОВ (ОПТИМИЗИРОВАН) ====================

bot.on('callback_query:data', async (ctx) => {
  const callbackData = ctx.callbackQuery.data;
  const userId = ctx.from.id;

  try {
    // ==================== ОБРАБОТКА ОПЛАТЫ ====================
    if (callbackData === 'payment_next_welcome') {
      await ctx.answerCallbackQuery();
      await showPaymentStep(ctx, 'step1');
    }
    else if (callbackData.startsWith('payment_next_')) {
      await ctx.answerCallbackQuery();
      const currentStep = callbackData.replace('payment_next_', '');
      const stepOrder = ['welcome', 'step1', 'step2', 'step3', 'step4'];
      const currentIndex = stepOrder.indexOf(currentStep);
      if (currentIndex >= 0 && currentIndex < stepOrder.length - 1) {
        const nextStep = stepOrder[currentIndex + 1];
        await showPaymentStep(ctx, nextStep);
      }
    }
    else if (callbackData.startsWith('payment_back_')) {
      await ctx.answerCallbackQuery();
      const currentStep = callbackData.replace('payment_back_', '');
      const stepOrder = ['welcome', 'step1', 'step2', 'step3', 'step4'];
      const currentIndex = stepOrder.indexOf(currentStep);
      if (currentIndex > 0) {
        const prevStep = stepOrder[currentIndex - 1];
        if (prevStep === 'welcome') {
          await showPaymentWelcome(ctx);
        } else {
          await showPaymentStep(ctx, prevStep);
        }
      } else {
        await deleteUserMessages(ctx, userId);
        await showMainMenu(ctx);
      }
    }
    else if (callbackData === 'payment_paid') {
      await ctx.answerCallbackQuery();
      userPaymentState[userId] = { 
        currentStep: 'waiting',
        isWaitingForReceipt: true,
        messageIds: []
      };
      await deleteUserMessages(ctx, userId);
      const message = await ctx.reply(paymentSteps.waitingForReceipt.message, {
        parse_mode: 'Markdown',
        reply_markup: getWaitingForReceiptKeyboard()
      });
      userPaymentState[userId].messageIds.push(message.message_id);
    }
    else if (callbackData === 'payment_cancel_receipt') {
      await ctx.answerCallbackQuery();
      await deleteUserMessages(ctx, userId);
      delete userPaymentState[userId];
      await showMainMenu(ctx);
    }

    // ==================== ОБРАБОТКА ТРЕНИРОВОК ====================
    else if (callbackData === 'btn_pilates') {
      await ctx.answerCallbackQuery({ text: '⏳ Загружаем информацию...' });
      await showTrainingDetails(ctx, 'pilates');
    }
    else if (callbackData === 'btn_stretching') {
      await ctx.answerCallbackQuery({ text: '⏳ Загружаем информацию...' });
      await showTrainingDetails(ctx, 'stretching');
    }
    else if (callbackData === 'btn_step') {
      await ctx.answerCallbackQuery({ text: '⏳ Загружаем информацию...' });
      await showTrainingDetails(ctx, 'step');
    }
    else if (callbackData === 'btn_functional') {
      await ctx.answerCallbackQuery({ text: '⏳ Загружаем информацию...' });
      await showTrainingDetails(ctx, 'functional');
    }

    // ==================== ОБРАБОТКА СПЕЦТРЕНИРОВОК ====================
    else if (callbackData === 'btn_special_smart_fitness') {
      await ctx.answerCallbackQuery({ text: '⏳ Загружаем программу...' });
      await showSpecialTrainingDetails(ctx, 'smart_fitness');
    }
    else if (callbackData === 'btn_special_transformation') {
      await ctx.answerCallbackQuery({ text: '⏳ Загружаем программу...' });
      await showSpecialTrainingDetails(ctx, 'transformation');
    }

    // ==================== ОБРАБОТКА ТРЕНЕРОВ ====================
    else if (callbackData === 'btn_trainer_irina') {
      await ctx.answerCallbackQuery({ text: '⏳ Загружаем профиль тренера...' });
      await showTrainerDetails(ctx, 'irina');
    }
    else if (callbackData === 'btn_trainer_anna') {
      await ctx.answerCallbackQuery({ text: '⏳ Загружаем профиль тренера...' });
      await showTrainerDetails(ctx, 'anna');
    }

    // ==================== ОБРАБОТКА РАСПИСАНИЯ ====================
    else if (callbackData === 'refresh_schedule') {
      await ctx.answerCallbackQuery({ text: '⏳ Обновляем расписание...' });
      try {
        const scheduleData = await scheduleManager.getSchedule();
        const message = scheduleManager.formatSchedule(scheduleData);
        await ctx.editMessageText(message, { 
          parse_mode: "Markdown",
          reply_markup: getScheduleKeyboard()
        });
      } catch (error) {
        console.error('Ошибка обновления расписания:', error);
        // Не вызываем повторно answerCallbackQuery
      }
    }

    // ==================== КНОПКИ ВОЗВРАТА ====================
    else if (callbackData === 'back_to_main_menu' || 
             callbackData === 'back_to_main_menu_from_trainer' ||
             callbackData === 'back_to_main_menu_from_schedule') {
      await ctx.answerCallbackQuery();
      await deleteUserMessages(ctx, userId);
      delete userPaymentState[userId];
      await showMainMenu(ctx);
    }
    else if (callbackData === 'back_to_trainings_list') {
      await ctx.answerCallbackQuery();
      await ctx.editMessageText('Выберите тип тренировки:', {
        reply_markup: getTrainingsKeyboard()
      });
    }
    else if (callbackData === 'back_to_special_list') {
      await ctx.answerCallbackQuery();
      await ctx.editMessageText('🎫 *Тренировки с ограниченным количеством мест*\n\nВыберите программу:', {
        parse_mode: 'Markdown',
        reply_markup: getSpecialTrainingsKeyboard()
      });
    }
    else if (callbackData === 'back_to_trainers_list') {
      await ctx.answerCallbackQuery();
      await ctx.editMessageText('👨‍🏫 *Наши тренеры*\n\nВыберите тренера, чтобы узнать больше:', {
        parse_mode: 'Markdown',
        reply_markup: getTrainersKeyboard()
      });
    }
    else if (callbackData === 'contact_for_booking') {
      await ctx.answerCallbackQuery({ text: '📞 Контакты администратора' });
      await ctx.reply(
        '📞 *Для записи на специальные тренировки свяжитесь с администратором:*\n\n' +
        '👩‍💼 *Анна*\n' +
        '📱 Телефон: +7 (953) 096-94-27\n' +
        '🕒 Часы работы: ежедневно с 9:00 до 21:00\n\n' +
        '📧 Или напишите в Telegram: @Anna_Zakharova_fit',
        { parse_mode: 'Markdown' }
      );
    }

  } catch (error) {
    console.error('Ошибка в обработчике callback:', error);
    try {
      await ctx.answerCallbackQuery({ text: '❌ Произошла ошибка' });
    } catch (e) {
      // Игнорируем, если уже отвечали
    }
  }
});

// ==================== НАСТРОЙКА КОМАНД БОТА ====================

async function setupBotCommands() {
  try {
    await bot.api.setMyCommands([
      { command: 'start', description: '🚀 Запустить бота' },
      { command: 'menu', description: '🏠 Главное меню' },
      { command: 'help', description: '📚 Список команд' },
      { command: 'trainings', description: '🏋️‍♀️ Направления тренировок' },
      { command: 'special_trainings', description: '🎫 Тренировки с ограниченными местами' },
      { command: 'payment', description: '💰 Информация об оплате' },
      { command: 'trainers', description: '👨‍🏫 Наши тренеры' },
      { command: 'schedule', description: '📅 Расписание занятий' },
      { command: 'questions', description: '❓ Часто задаваемые вопросы' }
    ]);
    console.log('✅ Команды бота установлены в боковое меню');
  } catch (error) {
    console.error('❌ Ошибка при установке команд:', error);
  }
}

// ==================== ОБРАБОТЧИК ОШИБОК ====================

bot.catch((err) => {
  console.error('❌ Ошибка бота:', err.error);
  const ctx = err.ctx;
  if (ctx) {
    console.error(`Обновление: ${ctx.update.update_id}`);
    ctx.reply('❌ Произошла ошибка при обработке команды. Пожалуйста, попробуйте еще раз.')
      .catch(e => console.error('Не удалось отправить сообщение об ошибке:', e));
  }
});

// ==================== ЗАПУСК БОТА ====================

async function startBot() {
  await setupBotCommands();
  bot.start();
  console.log('🤖 Бот запущен и готов к работе!');
}

startBot();