import { util } from '../../common/util.js';

export const pagination = (() => {

    let perPage = 10;
    let pageNow = 0;
    let totalData = 0;

    /**
     * @type {HTMLElement|null}
     */
    let page = null;

    /**
     * @type {HTMLElement|null}
     */
    let liPrev = null;

    /**
     * @type {HTMLElement|null}
     */
    let liNext = null;

    /**
     * @type {HTMLElement|null}
     */
    let paginate = null;

    /**
     * @type {HTMLElement|null}
     */
    let comment = null;

    /**
     * @param {number} num 
     * @returns {void}
     */
    const setPer = (num) => {
        perPage = Number(num);
    };

    /**
     * @returns {number}
     */
    const getPer = () => perPage;

    /**
     * @returns {number}
     */
    const getNext = () => pageNow;

    /**
     * @returns {number}
     */
    const getTotal = () => totalData;

    /**
     * Get offset for database query
     * @returns {number}
     */
    const getOffset = () => pageNow;

    /**
     * Get current page number (1-based)
     * @returns {number}
     */
    const getCurrentPage = () => Math.floor(pageNow / perPage) + 1;

    /**
     * @returns {void}
     */
    const disablePrevious = () => {
        if (!liPrev.classList.contains('disabled')) {
            liPrev.classList.add('disabled');
        }
    };

    /**
     * @returns {void}
     */
    const enablePrevious = () => {
        if (liPrev.classList.contains('disabled')) {
            liPrev.classList.remove('disabled');
        }
    };

    /**
     * @returns {void}
     */
    const disableNext = () => {
        if (!liNext.classList.contains('disabled')) {
            liNext.classList.add('disabled');
        }
    };

    /**
     * @returns {void}
     */
    const enableNext = () => {
        if (liNext.classList.contains('disabled')) {
            liNext.classList.remove('disabled');
        }
    };

    /**
     * @param {HTMLButtonElement} button 
     * @returns {object}
     */
    const buttonAction = (button) => {
        disableNext();
        disablePrevious();

        const btn = util.disableButton(button, util.loader ? util.loader.replace('ms-0 me-1', 'mx-1') : 'Loading...', true);

        const process = () => {
            // Listen for comment loading completion
            comment.addEventListener('undangan.comment.done', () => {
                btn.restore();
                updatePaginationState();
            }, { once: true });

            // Scroll to comments after loading
            comment.addEventListener('undangan.comment.done', () => {
                comment.scrollIntoView({ behavior: 'smooth' });
            }, { once: true });

            // Trigger comment reload with pagination
            if (window.undangan && window.undangan.comment && window.undangan.comment.show) {
                window.undangan.comment.show();
            } else {
                // Fallback: dispatch event
                comment.dispatchEvent(new Event('undangan.comment.show'));
            }
        };

        const next = () => {
            pageNow += perPage;
            process();
        };

        const prev = () => {
            pageNow = Math.max(0, pageNow - perPage);
            process();
        };

        return {
            next,
            prev,
        };
    };

    /**
     * Update pagination state after data load
     */
    const updatePaginationState = () => {
        if (totalData <= perPage && pageNow === 0) {
            paginate.classList.add('d-none');
            return;
        }

        const current = getCurrentPage();
        const total = Math.ceil(totalData / perPage);

        page.innerText = `${current} / ${total}`;

        // Enable/disable previous button
        if (pageNow > 0) {
            enablePrevious();
        } else {
            disablePrevious();
        }

        // Enable/disable next button
        if (current >= total) {
            disableNext();
        } else {
            enableNext();
        }

        // Show pagination if needed
        if (paginate.classList.contains('d-none')) {
            paginate.classList.remove('d-none');
        }
    };

    /**
     * @returns {boolean}
     */
    const reset = () => {
        if (pageNow === 0) {
            return false;
        }

        pageNow = 0;
        disableNext();
        disablePrevious();
        
        // Update page display
        if (page && totalData > 0) {
            const total = Math.ceil(totalData / perPage);
            page.innerText = `1 / ${total}`;
        }

        return true;
    };

    /**
     * @param {number} len 
     * @returns {void}
     */
    const setTotal = (len) => {
        totalData = Number(len);
        updatePaginationState();
    };

    /**
     * Go to specific page
     * @param {number} pageNumber 1-based page number
     */
    const goToPage = (pageNumber) => {
        const targetPage = Math.max(1, Math.min(pageNumber, Math.ceil(totalData / perPage)));
        pageNow = (targetPage - 1) * perPage;
        updatePaginationState();
        
        // Reload comments
        if (window.undangan && window.undangan.comment && window.undangan.comment.show) {
            window.undangan.comment.show();
        }
    };

    /**
     * Check if there are more pages available
     * @returns {boolean}
     */
    const hasNextPage = () => {
        return getCurrentPage() < Math.ceil(totalData / perPage);
    };

    /**
     * Check if there are previous pages available
     * @returns {boolean}
     */
    const hasPrevPage = () => {
        return getCurrentPage() > 1;
    };

    /**
     * @returns {void}
     */
    const init = () => {
        paginate = document.getElementById('pagination');
        
        if (!paginate) {
            console.warn('Pagination element not found');
            return;
        }

        paginate.innerHTML = `
        <ul class="pagination mb-2 shadow-sm rounded-4">
            <li class="page-item disabled" id="previous">
                <button class="page-link rounded-start-4" onclick="window.undangan.comment.pagination.previous(this)" data-offline-disabled="false">
                    <i class="fa-solid fa-circle-left me-1"></i>Prev
                </button>
            </li>
            <li class="page-item disabled">
                <span class="page-link text-theme-auto" id="page">1 / 1</span>
            </li>
            <li class="page-item disabled" id="next">
                <button class="page-link rounded-end-4" onclick="window.undangan.comment.pagination.next(this)" data-offline-disabled="false">
                    Next<i class="fa-solid fa-circle-right ms-1"></i>
                </button>
            </li>
        </ul>`;

        comment = document.getElementById('comments');
        page = document.getElementById('page');
        liPrev = document.getElementById('previous');
        liNext = document.getElementById('next');

        // Setup global namespace
        if (!window.undangan) {
            window.undangan = {};
        }
        if (!window.undangan.comment) {
            window.undangan.comment = {};
        }
        
        window.undangan.comment.pagination = {
            previous: (btn) => buttonAction(btn).prev(),
            next: (btn) => buttonAction(btn).next(),
            goToPage: goToPage,
            reset: reset,
            setTotal: setTotal
        };

        // Initially hide pagination
        paginate.classList.add('d-none');
    };

    return {
        init,
        setPer,
        getPer,
        getNext,
        getOffset,
        getCurrentPage,
        reset,
        setTotal,
        getTotal, // Fixed typo from geTotal
        goToPage,
        hasNextPage,
        hasPrevPage,
        updatePaginationState,
        previous: (btn) => buttonAction(btn).prev(),
        next: (btn) => buttonAction(btn).next(),
    };
})();