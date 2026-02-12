const fs = require('fs').promises;
const path = require('path');

class ScheduleManager {
    constructor(filePath = './schedule.json') {
        this.filePath = path.join(__dirname, filePath);
        this.cache = null;
        this.cacheTime = null;
        this.CACHE_TTL = 30000; // 30 секунд кэша (меньше для более частых обновлений)
    }

    // Загружаем расписание с кэшированием
    async getSchedule() {
        const now = Date.now();
        
        if (this.cache && this.cacheTime && (now - this.cacheTime < this.CACHE_TTL)) {
            return this.cache;
        }

        try {
            const data = await fs.readFile(this.filePath, 'utf8');
            this.cache = JSON.parse(data);
            this.cacheTime = now;
            return this.cache;
        } catch (error) {
            console.error('Ошибка загрузки расписания:', error);
            // Возвращаем расписание по умолчанию при ошибке
            return this.getDefaultSchedule();
        }
    }

    // Обновляем расписание (для админа)
    async updateSchedule(newSchedule) {
        try {
            const updatedData = {
                ...newSchedule,
                last_updated: new Date().toISOString().split('T')[0]
            };
            
            await fs.writeFile(
                this.filePath, 
                JSON.stringify(updatedData, null, 2),
                'utf8'
            );
            
            this.cache = updatedData;
            this.cacheTime = Date.now();
            
            return { success: true, data: updatedData };
        } catch (error) {
            console.error('Ошибка обновления расписания:', error);
            return { success: false, error: error.message };
        }
    }

    // Расписание по умолчанию
    getDefaultSchedule() {
        return {
            schedule: {
                monday: [
                    { time: "9:30-10:30", name: "Пилатес", trainer: "Анна" },
                    { time: "18:00-19:00", name: "Стретчинг", trainer: "Ирина" }
                ],
                tuesday: [
                    { time: "8:00-9:00", name: "Функциональный тренинг", trainer: "Анна" },
                    { time: "19:00-20:00", name: "Степ", trainer: "Ирина" }
                ],
                wednesday: [
                    { time: "9:30-10:30", name: "Пилатес", trainer: "Анна" },
                    { time: "18:00-19:00", name: "Функциональный тренинг", trainer: "Ирина" }
                ],
                thursday: [
                    { time: "8:00-9:00", name: "Стретчинг", trainer: "Анна" },
                    { time: "19:00-20:00", name: "Степ", trainer: "Ирина" }
                ],
                friday: [
                    { time: "9:30-10:30", name: "Пилатес", trainer: "Анна" },
                    { time: "18:00-19:00", name: "Функциональный тренинг", trainer: "Ирина" }
                ],
                saturday: [
                    { time: "10:00-11:00", name: "Субботний микс", trainer: "Анна" }
                ],
                sunday: []
            },
            last_updated: new Date().toISOString().split('T')[0],
            note: "📝 *Внимание:* Расписание может меняться. Уточняйте актуальную информацию у администратора."
        };
    }

    // Форматируем расписание в красивый текст
    formatSchedule(scheduleData) {
        const daysMap = {
            monday: "Понедельник",
            tuesday: "Вторник",
            wednesday: "Среда",
            thursday: "Четверг",
            friday: "Пятница",
            saturday: "Суббота",
            sunday: "Воскресенье"
        };

        let message = "🗓️ *РАСПИСАНИЕ ЗАНЯТИЙ*\n\n";
        message += `📅 Обновлено: ${scheduleData.last_updated}\n\n`;
        
        let hasClasses = false;

        for (const [dayKey, dayName] of Object.entries(daysMap)) {
            const classes = scheduleData.schedule[dayKey];
            
            if (classes && classes.length > 0) {
                hasClasses = true;
                message += `*${dayName.toUpperCase()}*\n`;
                
                classes.forEach(cls => {
                    // Добавляем эмодзи в зависимости от типа тренировки
                    let emoji = "🏋️‍♀️";
                    if (cls.name.toLowerCase().includes("пилатес")) emoji = "🧘‍♀️";
                    if (cls.name.toLowerCase().includes("стретчинг")) emoji = "🤸‍♀️";
                    if (cls.name.toLowerCase().includes("степ")) emoji = "🏃‍♀️";
                    if (cls.name.toLowerCase().includes("функциональный")) emoji = "💪";
                    
                    message += `${emoji} *${cls.time}* - ${cls.name}`;
                    if (cls.trainer) {
                        message += ` (тренер: ${cls.trainer})`;
                    }
                    message += '\n';
                });
                message += '\n';
            }
        }

        if (!hasClasses) {
            message += "На этой неделе занятий нет.\n";
        }

        if (scheduleData.note) {
            message += `\n${scheduleData.note}`;
        }

        return message;
    }

    // Проверяем, есть ли расписание на сегодня
    getTodaySchedule() {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = new Date().getDay(); // 0 - воскресенье, 1 - понедельник и т.д.
        const todayKey = days[today];
        
        return this.cache ? this.cache.schedule[todayKey] || [] : [];
    }
}

module.exports = ScheduleManager;