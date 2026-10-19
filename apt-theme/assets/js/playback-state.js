(() => {
    let footerHomeLayout;
    let footerResizeObserver;
    let footerObservedElements = [];
    let footerFrame;


    // dynamic sizing listener for bottom external links bar
    // it doesn't have any real purpose but it looks cool :^)
    // mostly intended for when there's a thread image, it adapts to the dimensions
    function initializeFooterLayout() {
        const homeLayout = document.querySelector('.apt-theme .apt-home-layout');
        if (homeLayout !== footerHomeLayout) {
            footerResizeObserver?.disconnect();
            cancelAnimationFrame(footerFrame);
            footerResizeObserver = undefined;
            footerObservedElements = [];
            footerHomeLayout = homeLayout;
        }
        if (!homeLayout) return;

        if (!footerResizeObserver) {
            const updateWidth = () => {
                const thread = homeLayout.querySelector('#thread-container');
                const broadcastPanel = homeLayout.querySelector('.apt-broadcast-panel');
                const footer = homeLayout.querySelector('.apt-sidebar-column > .footer');
                const homeLayoutBounds = homeLayout.getBoundingClientRect();
                const threadBounds = thread.getBoundingClientRect();
                const broadcastPanelBounds = broadcastPanel.getBoundingClientRect();
                const footerBounds = footer.getBoundingClientRect();
                const gap = parseFloat(getComputedStyle(homeLayout).columnGap);
                const imageBesideFooter = thread.querySelector('#thread > img')
                    && threadBounds.bottom > footerBounds.top
                    && threadBounds.top < footerBounds.bottom;
                let width = imageBesideFooter
                    ? Math.max(0, threadBounds.left - homeLayoutBounds.left - gap)
                    : homeLayoutBounds.width;
                if (broadcastPanelBounds.bottom > footerBounds.top && broadcastPanelBounds.top < footerBounds.bottom) {
                    width = Math.min(width, Math.max(0, broadcastPanelBounds.left - homeLayoutBounds.left - gap));
                }
                homeLayout.style.setProperty('--apt-footer-width', `${width}px`);
            };
            footerResizeObserver = new ResizeObserver(() => {
                cancelAnimationFrame(footerFrame);
                footerFrame = requestAnimationFrame(updateWidth);
            });
        }

        const elements = [homeLayout, ...homeLayout.querySelectorAll('.apt-sidebar, .apt-news, .apt-broadcast-panel, .apt-thread-area, #thread-container, .apt-sidebar-column > .footer')];
        for (const element of footerObservedElements) {
            if (!elements.includes(element)) footerResizeObserver.unobserve(element);
        }
        for (const element of elements) {
            if (!footerObservedElements.includes(element)) footerResizeObserver.observe(element, { box: 'border-box' });
        }
        footerObservedElements = elements;
    }

    // allow clicking out of hambahgah menu in phone/tablet layout to minimize it
    document.addEventListener('click', event => {
        const button = document.querySelector('.apt-theme .navbar-burger[data-target="public-navbar"].is-active');
        const menu = document.getElementById('public-navbar');
        if (!button) return;
        if (button.contains(event.target) || menu.contains(event.target)) return;

        button.classList.remove('is-active');
        button.setAttribute('aria-expanded', 'false');
        menu.classList.remove('is-active');
    });

    // run on initial load and also page switches
    document.addEventListener('htmx:load', initializeFooterLayout);
    initializeFooterLayout();
})();
