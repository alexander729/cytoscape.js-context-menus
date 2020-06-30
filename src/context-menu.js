import { setBooleanAttribute, getClassStr, isIn, getDimensionsHidden } from './utils';
import { DIVIDER_CSS_CLASS } from './constants';

// TODO: add submenu property
export class MenuItem extends HTMLButtonElement {
    /**
     * @param {{ 
     *      id: string; 
     *      tooltipText?: string;
     *      disabled?: boolean; 
     *      image?: { 
     *          src: string; 
     *          width: number; 
     *          height: number; 
     *          y: string; 
     *          x: string; 
     *      }; 
     *      content: string; 
     *      selector: string; 
     *      show?: boolean; 
     *      submenu?: Array;
     *      coreAsWell?: boolean;
     *      onClickFunction?: any;
     *      hasTrailingDivider?: boolean;
     * }} params
     * @param { * } onMenuItemClick 
     * passed so that submenu items can have this
     * called when the menu item is clicked
     */
    constructor(
        params,
        onMenuItemClick,
        scratchpad
    ) {
        super();

        super.setAttribute('id', params.id);

        let className = this._getMenuItemClassStr(scratchpad['cxtMenuItemClasses'], params.hasTrailingDivider);

        super.setAttribute('class', className);

        if (typeof params.tooltipText !== undefined) {
            super.setAttribute('title', params.tooltipText);
        }

        if (params.disabled) {
            setBooleanAttribute(this, 'disabled', true);
        }
        
        if (params.image) {
            let img = document.createElement('img');
            img.src = params.image.src;
            img.width = params.image.width;
            img.height = params.image.height;
            img.style.position = 'absolute';
            img.style.top = params.image.y + 'px';
            img.style.left = params.image.x + 'px';
            
            super.appendChild(img);
        }

        this.innerHTML += params.content;

        this.onMenuItemClick = onMenuItemClick;

        this.data = {};
        this.clickFns = [];
        this.selector = params.selector;
        this.show = params.show || true;
        this.coreAsWell = params.coreAsWell || false;
        this.scratchpad = scratchpad;

        if (typeof params.onClickFunction === 'undefined' && 
            typeof params.submenu === 'undefined') {

            throw new Error("A menu item must either have click function or a submenu or both");
        }

        this.onClickFunction = params.onClickFunction;

        // Create the submenu if neccessary
        if (params.submenu instanceof Array) {
            this._createSubmenu(params.submenu);
        }
    }

    bindOnClickFunction(onClickFn) {
        this.clickFns.push(onClickFn);

        super.addEventListener('click', onClickFn);
    }

    unbindOnClickFunctions() {
        for (let onClickFn of this.clickFns) {
            super.removeEventListener('click', onClickFn);
        }
        this.clickFns = [];
    }

    enable() {
        setBooleanAttribute(this, 'disabled', false);

        if (this.hasSubmenu()) {
            this.addEventListener('mouseenter', this.mouseEnterHandler);
        }
    }

    disable() {
        setBooleanAttribute(this, 'disabled', true);

        if (this.hasSubmenu()) {
            this.removeEventListener('mouseenter', this.mouseEnterHandler);
        }
    }

    hide() {
        this.show = false;
        this.style.display = 'none';
    }

    hasSubmenu() {
        return this.submenu instanceof MenuItemList;
    }

    appendSubmenuItem(menuItem, before = undefined) {
        if (!this.hasSubmenu()) {
            this._createSubmenu();    
        }
        this.submenu.appendMenuItem(menuItem, before)
    }

    isClickable() {
        return this.onMenuItemClick !== undefined;
    }

    display() {
        this.show = true;
        this.style.display = 'block';
    }

    /**
     * Removes the submenu if exists
     */
    removeSubmenu() {
        if (this.hasSubmenu()) {
            this.submenu.removeAllMenuItems();
            this.removeChild(this.submenu);
            this.removeEventListener('mouseenter', this.mouseEnterHandler);
            this.removeEventListener('mouseleave', this.mouseLeaveHandler);
            this.submenu = undefined;
        }
    }

    _onMouseEnter(_event) {
        let rect = this.getBoundingClientRect();
        let submenuRect = getDimensionsHidden(this.submenu);

        let exceedsRight = (rect.right + submenuRect.width) > window.innerWidth;
        let exceedsBottom = (rect.top + submenuRect.height) > window.innerHeight;

        // Adjusts the position of the submenu 
        if (!exceedsRight && !exceedsBottom) {
            this.submenu.style.left = this.clientWidth + "px";
            this.submenu.style.top = "0px";
            this.submenu.style.right = "auto";
            this.submenu.style.bottom = "auto";
        } else if (exceedsRight && !exceedsBottom) {
            this.submenu.style.right = this.clientWidth + "px";
            this.submenu.style.top = "0px";
            this.submenu.style.left = "auto";
            this.submenu.style.bottom = "auto";
        } else if (exceedsRight && exceedsBottom) {
            this.submenu.style.right = this.clientWidth + "px";
            this.submenu.style.bottom = "0px";
            this.submenu.style.top = "auto";
            this.submenu.style.left = "auto";
        } else {
            this.submenu.style.left = this.clientWidth + "px";
            this.submenu.style.bottom = "0px";
            this.submenu.style.right = "auto";
            this.submenu.style.top = "auto";
        }                

        this.submenu.display();
    }

    _onMouseLeave(event) {
        let pos = { x: event.clientX, y: event.clientY };

        // Hide if mouse is not passed to the submenu
        if (!isIn(pos, this.submenu)) {
            this.submenu.hide();
        }
    }

    _createSubmenu(items = []) {
        // We generate another indicator for each
        let indicator = this.scratchpad['submenuIndicatorGen']();
        this.submenu = new MenuItemList(this.onMenuItemClick, this.scratchpad);

        this.appendChild(indicator);
        this.appendChild(this.submenu);

        for (let item of items) {
            let menuItem = new MenuItem(item, this.onMenuItemClick, this.scratchpad);
            this.submenu.appendMenuItem(menuItem);
        }

        this.mouseEnterHandler = this._onMouseEnter.bind(this);
        this.mouseLeaveHandler = this._onMouseLeave.bind(this);

        // submenu should be visible when mouse is over
        this.addEventListener('mouseenter', this.mouseEnterHandler);

        this.addEventListener('mouseleave', this.mouseLeaveHandler);
    }

    _getMenuItemClassStr(classStr, hasTrailingDivider) {
        return hasTrailingDivider ?
            classStr + ' ' + DIVIDER_CSS_CLASS :
            classStr;
    };  

    static define() {
        customElements.define('ctx-menu-item', MenuItem, { extends: 'button' });
    }
}

export class MenuItemList extends HTMLDivElement {
    constructor(onMenuItemClick, scratchpad) {
        super();

        super.setAttribute('class', scratchpad['cxtMenuClasses']);

        this.style.position = 'absolute';

        this.onMenuItemClick = onMenuItemClick;
        this.scratchpad = scratchpad;
    }

    hide() {
        this.hideMenuItemSubmenus();

        this.style.display = 'none';
    }

    display() {
        this.style.display = 'block';
    }

    /**
     * Hides all menu items
     */
    hideMenuItems(){
        for (let item of this.children) {
            if (item instanceof HTMLElement) {
                item.style.display = 'none';
            } else {
                console.warn(`${item} is not a HTMLElement`);
            }
        }
    }

    hideMenuItemSubmenus() {
        for (let menuItem of this.children) {
            if (menuItem instanceof MenuItem) {
                if (menuItem.submenu) {
                    menuItem.submenu.hide();
                }
            }
        }
    }

    /**
     * @param { MenuItem } menuItem
     * @param { Element? } before 
     * If before is specified menuItem is inserted before this element instead of at the end \
     * By default appends at the end of the this
     */
    appendMenuItem(menuItem, before = undefined) {
        if (typeof before !== 'undefined') {
            if (before.parentNode === this) {
                this.insertBefore(menuItem, before);
            } else {
                throw new Error(`The item with id='${before.id}' is not a child of the context menu`);
            }
        } else {
            this.appendChild(menuItem);
        }

        if (menuItem.isClickable()) {
            this._performBindings(menuItem);
        }
    }

    /**
     * Removes any menuItem that is any children of the context menu
     * Returns true if child is found and removed, false otherwise
     * @param { MenuItem } menuItem 
     */
    removeMenuItem(menuItem) {
        if (this._removeImmediateMenuItem(menuItem)) {
            return true;
        } else {
            for (let child of this.children) {
                if (child instanceof MenuItem && child.hasSubmenu()) {
                    if (child.submenu.removeMenuItem(menuItem)) {
                        return true;
                    }
                }
            }            
            // throw new Error(`The item with id='${menuItem.id}' is not a child of the context menu`);
            return false;
        }
    }

    /**
     * Moves a menuItem before another
     * @param { MenuItem } menuItem 
     * @param { MenuItem } before 
     */
    moveBefore(menuItem, before) {
        if (menuItem.parentNode !== this) {
            throw new Error(`The item with id='${menuItem.id}' is not a child of context menu`);
        }
        if (before.parentNode !== this) {
            throw new Error(`The item with id='${before.id}' is not a child of context menu`);
        }

        this.removeChild(menuItem);
        this.insertBefore(menuItem, before);
    }

    removeAllMenuItems() {        
        // https://stackoverflow.com/a/3955238/12045421
        while (this.firstChild) {
            let child = this.lastChild;
            if (child instanceof MenuItem) {
                this._removeImmediateMenuItem(child);
            } else {
                console.warn("Found non menu item in the context menu: ", child);
                // Remove it as well
                this.removeChild(child);
            }
        }
    }

    /**
     * Removes if the menu item is direct child of the parent
     * @param { MenuItem } menuItem 
     */
    _removeImmediateMenuItem(menuItem) {
        if (menuItem.parentNode === this) {
            menuItem.removeSubmenu();
            menuItem.unbindOnClickFunctions();

            this.removeChild(menuItem);
            return true;
        } else {
            return false;
        }
    }

    /**
     * @param { MenuItem } menuItem
     */
    _performBindings(menuItem) {
        let callback = this._bindOnClick(menuItem.onClickFunction);
        menuItem.bindOnClickFunction(callback);
        menuItem.bindOnClickFunction(this.onMenuItemClick);
    }

    _bindOnClick(onClickFn) {
        return () => {
            let event = this.scratchpad['currentCyEvent']; 
            onClickFn(event);
        };
    }

    static define() {
        customElements.define('menu-item-list', MenuItemList, { extends: 'div' });
    }
}

export class ContextMenu extends MenuItemList {

    constructor(onMenuItemClick, scratchpad) {
        super(onMenuItemClick, scratchpad);

        // Called when a menu item is clicked
        this.onMenuItemClick = (event) => {
            // So that parent menuItems won't be clicked
            event.stopPropagation();
            this.hide();
            onMenuItemClick();
        };

        /* this.addEventListener('mouseleave', (_event) => {
            this.hideMenuItemSubmenus();
        }); */
    }

    /**
     * Inserts the menu item to the context menu \
     * If before is specified, item is inserted before the 'before' inside the same submenu \
     * The parent argument is ignored if before is specified because parent can be inferred from the before argument \
     * If parent is specified, item is inserted into the submenu of specified parent
     * @param { MenuItem } menuItem 
     * @param {{ before?: MenuItem, parent?: MenuItem }} param1
     */
    insertMenuItem(menuItem, { before, parent } = {}) {
        if (typeof before !== 'undefined') {
            if (this.contains(before)) {
                let parent = before.parentNode;
                if (parent instanceof MenuItemList) {
                    parent.appendMenuItem(menuItem, before);
                } else {
                    throw new Error(`Parent of before(id=${before.id}) is not a submenu`);
                }
            } else {
                throw new Error(`before(id=${before.id}) is not in the context menu`);
            }
        } else if (typeof parent !== 'undefined') {
            if (this.contains(parent)) {
                parent.appendSubmenuItem(menuItem);
            } else {
                throw new Error(`parent(id=${parent.id}) is not a descendant of the context menu`);
            }
        } else {
            this.appendMenuItem(menuItem);
        }
    }

    moveBefore(menuItem, before) {
        let parent = before.parentNode;
        if (parent instanceof MenuItemList) {
            if (this.contains(parent)) {
                // We need to check this otherwise infinite recursion occurs
                if (parent === this) {
                    super.moveBefore(menuItem, before);
                } else {
                    parent.moveBefore(menuItem, before);
                }
            } else {
                throw new Error(`parent(id=${parent.id}) is not in the contex menu`);
            }
        } else {
            throw new Error(`parent(id=${parent.id}) is not a menu`);
        }
    }

    static define() {
        customElements.define('ctx-menu', ContextMenu, { extends: 'div' });
    }
}