(function() {
    'use strict';

    const PLUGIN_NAME = 'jaja';
    const MENU_ITEM_ID = 'jaja-menu-item';
    const CORS_PROXY = 'https://api.allorigins.win/get?url='; // Обновленный прокси

    if (window.jajaPluginInitialized) return;
    window.jajaPluginInitialized = true;

    class JajaCore {
        constructor(data) {
            this.activity = data.activity;
            this.config = data;
            this.html = $('<div class="jaja-container"></div>');
            this.scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
            this.currentSite = this.detectSite();
            this.page = 1;
            this.hasMore = true;
        }

        // Обязательные методы компонента
        start() {
            this.loadContent();
            Lampa.Controller.toggle('content');
        }

        pause() {} // Добавлен обязательный метод
        stop() {}  // Добавлен обязательный метод

        destroy() {
            this.scroll.destroy();
            this.html.remove();
        }

        create() {
            return this.html;
        }

        detectSite() {
            return this.config.url.includes('jable') ? 'jable' : 'njav';
        }

        async loadContent() {
            try {
                const { items, nextPage } = await this.fetchData();
                this.renderItems(items);
                this.hasMore = !!nextPage;
            } catch (error) {
                console.error('[Jaja] Error:', error);
                Lampa.Noty.show('Ошибка загрузки контента. Попробуйте позже.');
            }
        }

        async fetchData() {
            const url = this.buildUrl();
            const response = await this.networkRequest(url);
            const $html = $(response);
            
            return {
                items: this.parseItems($html),
                nextPage: this.parseNextPage($html)
            };
        }

        async networkRequest(url) {
            return new Promise((resolve, reject) => {
                Lampa.Reguest().native(CORS_PROXY + encodeURIComponent(url), 
                    data => resolve(data.contents), 
                    error => reject(error),
                    false,
                    { dataType: 'json' }
                );
            });
        }

        parseItems($html) {
            return $html.find('.video-img-box, .box-item').map((i, el) => ({
                title: $(el).find('.title, .detail a').text().trim(),
                image: $(el).find('img').data('src') || $(el).find('img').attr('src'),
                url: $(el).find('a').attr('href'),
                duration: $(el).find('.label, .duration').text().trim()
            })).get();
        }

        parseNextPage($html) {
            return $html.find('.pagination a').last().attr('href');
        }

        renderItems(items) {
            const cards = items.map(item => this.createCard(item));
            this.html.append(cards);
            this.scroll.append(this.html);
        }

        createCard(item) {
            const card = $(`
                <div class="card card--collection">
                    <div class="card__img"></div>
                    <div class="card__title">${item.title}</div>
                    ${item.duration ? `<div class="card__quality">${item.duration}</div>` : ''}
                </div>
            `);

            this.loadImage(card, item);
            return card;
        }

        loadImage(card, item) {
            const img = new Image();
            img.src = item.image;
            img.onload = () => card.addClass('card--loaded');
            img.onerror = () => this.handleImageError(card, item.title);
            card.find('.card__img').replaceWith(img);
        }

        handleImageError(card, title) {
            const color = this.generateColor(title);
            card.find('.card__img').css({
                backgroundColor: color.background,
                color: color.text
            }).text(title.substring(0, 2));
        }

        generateColor(title) {
            const hash = Lampa.Utils.hash(title);
            const hex = (hash * 0xFFFFFF).toString(16).slice(0,6).padEnd(6, '0');
            const brightness = parseInt(hex, 16) > 0xAAAAAA;
            return {
                background: `#${hex}`,
                text: brightness ? '#000' : '#fff'
            };
        }
    }

    // Инициализация плагина
    function initPlugin() {
        Lampa.Component.add(PLUGIN_NAME, JajaCore);
        addMenuEntry();
        addStyles();
    }

    function addMenuEntry() {
        const menuItem = $(`
            <li id="${MENU_ITEM_ID}" class="menu__item selector">
                <div class="menu__ico">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.18 5 4.05 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                </div>
                <div class="menu__text">18+ Контент</div>
            </li>
        `).on('hover:enter', () => {
            Lampa.Activity.push({
                title: '18+ Контент',
                component: PLUGIN_NAME,
                url: 'https://jable.tv/latest-updates/'
            });
        });

        const tryAdd = () => $('.menu__list').first().append(menuItem);
        tryAdd() || Lampa.Listener.follow('app', e => e.type === 'ready' && tryAdd());
    }

    function addStyles() {
        const styles = `
            .jaja-container {
                padding: 20px;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 15px;
            }
            .card--collection .card__quality {
                background: rgba(0,0,0,0.7);
                padding: 2px 8px;
                border-radius: 4px;
                position: absolute;
                bottom: 8px;
                right: 8px;
                font-size: 12px;
            }
        `;
        $('<style>').html(styles).appendTo('head');
    }

    if (window.appready) {
        initPlugin();
    } else {
        Lampa.Listener.follow('app', e => e.type === 'ready' && initPlugin());
    }

})();
