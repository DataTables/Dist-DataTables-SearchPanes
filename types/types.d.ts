import DataTables, { Options, Config, Dom, Api, Context, Order } from 'datatables.net';
export { default } from 'datatables.net';

interface IClasses$1 {
    badgePill?: string;
    bordered: string;
    buttonGroup: string;
    buttonSub: string;
    caret: string;
    clear: string;
    clearAll: string;
    clearButton: string;
    collapseAll: string;
    collapseButton: string;
    container: string;
    countButton: string;
    disabledButton: string;
    hidden: string;
    hide: string;
    layout: string;
    name: string;
    nameButton: string;
    nameCont: string;
    narrow: string;
    narrowButton?: string;
    narrowSearch?: string;
    narrowSub?: string;
    paneButton: string;
    paneInputButton: string;
    pill: string;
    rotated: string;
    search: string;
    searchCont: string;
    searchIcon: string;
    searchLabelCont: string;
    selected: string;
    show?: string;
    smallGap: string;
    subRow1: string;
    subRow2: string;
    subRowsContainer: string;
    table?: string;
    title: string;
    topRow: string;
}
interface IConfigPaneItem {
    className: string;
    dtOpts: Options;
    header: string;
    name: string;
    options: IOption[];
    preSelect: string[];
}
interface IDataArray {
    display: any;
    filter: any;
    sort: any;
    type: string;
}
interface IDataArrayST extends IDataArray {
    shown: number;
    total: number;
}
interface IDefaults$1 {
    clear: boolean;
    collapse: boolean;
    combiner: string;
    container: (dt: any) => HTMLElement;
    controls: boolean;
    dtOpts: {
        [keys: string]: any;
    };
    emptyMessage: string | null;
    hideCount: boolean;
    i18n: {
        aria: {
            clearPane: string;
            clearSearch: string;
            collapse: string;
            orderByCount: string;
            orderByLabel: string;
        };
        clearPane: string;
        count: string;
        countFiltered: string;
        emptyMessage: string;
        searchTitle: string;
    };
    initCollapsed: boolean;
    layout: string;
    name: string;
    orderable: boolean;
    orthogonal: IOrthogonal;
    preSelect: any;
    threshold: number;
    viewCount: boolean;
}
interface IDOM$1 {
    buttonGroup: Dom<HTMLElement>;
    clear: Dom<HTMLElement>;
    collapseButton: Dom<HTMLElement>;
    container: Dom<HTMLElement>;
    countButton: Dom<HTMLElement>;
    dtP: Dom<HTMLElement>;
    lower: Dom<HTMLElement>;
    nameButton: Dom<HTMLElement>;
    panesContainer: Dom<HTMLElement>;
    searchBox: Dom<HTMLElement>;
    searchButton: Dom<HTMLElement>;
    searchCont: Dom<HTMLElement>;
    searchLabelCont: Dom<HTMLElement>;
    topRow: Dom<HTMLElement>;
    upper: Dom<HTMLElement>;
}
interface IIndexes {
    filter: any;
    index: number;
}
interface IOption {
    className?: string;
    filter?: string;
    label: string;
    order?: string;
    value: string | ((rowData: any, rowIdx: string) => boolean);
}
interface IOrthogonal {
    display: string;
    filter: string;
    hideCount: boolean;
    search: string;
    show: boolean;
    sort: string;
    threshold: number;
    type: string;
    viewCount: boolean;
}
interface IRowData {
    arrayFilter: IDataArray[];
    arrayOriginal: IDataArray[];
    bins: {
        [keys: string]: number;
    };
    binsOriginal: {
        [keys: string]: number;
    };
    filterMap: Map<number, any>;
    totalOptions: number;
}
interface IRowDataST extends IRowData {
    arrayFilter: IDataArrayST[];
    arrayOriginal: IDataArrayST[];
    arrayShown: IDataArrayST[];
    bins: {
        [keys: string]: number;
    };
    binsOriginal: {
        [keys: string]: number;
    };
    binsShown: {
        [keys: string]: number;
    };
    filterMap: Map<number, any>;
    totalOptions: number;
}
interface SPColumnOptions {
    className?: string;
    collapse?: boolean;
    combiner?: 'or' | 'and';
    controls?: boolean;
    info?: boolean;
    dtOpts?: Config;
    emptyMessage?: string;
    header?: string;
    hideCount?: boolean;
    initCollapsed?: boolean;
    name?: string;
    options?: Array<IOption>;
    orderable?: boolean;
    orthogonal?: IOrthogonal;
    preSelect?: string[];
    show?: boolean;
    threshold?: number;
    viewCount?: boolean;
}
interface IS$1 {
    colExists: boolean;
    colOpts: SPColumnOptions;
    customPaneSettings: IConfigPaneItem | null;
    deselectTimeout?: ReturnType<typeof setTimeout>;
    displayed: boolean;
    dt: Api;
    dtPane: Api | null;
    firstSet: boolean;
    index: number;
    indexes: IIndexes[];
    listSet: boolean;
    name: string;
    rowData: IRowData;
    scrollTop: number;
    searchFunction: any;
    selections: any[];
    serverSelect: any;
    serverSelecting: boolean;
    tableLength: number;
    updating: boolean;
}
interface ISST extends IS$1 {
    filteringActive: boolean;
    rowData: IRowDataST;
}

declare class SearchPane {
    static version: string;
    static classes: {
        bordered: string;
        buttonGroup: string;
        buttonSub: string;
        caret: string;
        clear: string;
        clearAll: string;
        clearButton: string;
        collapseAll: string;
        collapseButton: string;
        container: string;
        countButton: string;
        disabledButton: string;
        hidden: string;
        hide: string;
        layout: string;
        name: string;
        nameButton: string;
        nameCont: string;
        narrow: string;
        paneButton: string;
        paneInputButton: string;
        pill: string;
        rotated: string;
        search: string;
        searchCont: string;
        searchIcon: string;
        searchLabelCont: string;
        selected: string;
        smallGap: string;
        subRow1: string;
        subRow2: string;
        subRowsContainer: string;
        title: string;
        topRow: string;
    };
    static defaults: IDefaults$1;
    classes: IClasses$1;
    dom: IDOM$1;
    c: IDefaults$1;
    s: IS$1;
    /**
     * Creates the panes, sets up the search function
     *
     * @param hostCtx The settings for the searchPanes
     * @param opts The options for the default features
     * @param index the index of the column for this pane
     * @param panesContainer The overall container for SearchPanes that this pane will be attached to
     * @param panes The custom pane settings if this is a custom pane
     * @returns {object} the pane that has been created, including the table and the index of the pane
     */
    constructor(hostCtx: Context, opts: IConfig, index: number, panesContainer: Dom, panes?: IConfigPaneItem | null);
    /**
     * Adds a row to the panes table
     *
     * @param display the value to be displayed to the user
     * @param filter the value to be filtered on when searchpanes is implemented
     * @param shown the number of rows in the table that are currently visible
     *   matching this criteria
     * @param total the total number of rows in the table that match this
     *   criteria
     * @param sort the value to be sorted in the pane table
     * @param type the value of which the type is to be derived from
     */
    addRow(display: string, filter: any, sort: any, type: string, className?: string, total?: number, shown?: number | void): any;
    /**
     * Adjusts the layout of the top row when the screen is resized
     */
    adjustTopRow(): void;
    /**
     * In the case of a rebuild there is potential for new data to have been
     * included or removed so all of the rowData must be reset as a precaution.
     */
    clearData(): void;
    /**
     * Clear the selections in the pane
     */
    clearPane(): this;
    /**
     * Collapses the pane so that only the header is displayed
     */
    collapse(): void;
    /**
     * Strips all of the SearchPanes elements from the document and turns all of
     * the listeners for the buttons off
     */
    destroy(): void;
    /**
     * Getting the legacy message is a little complex due a legacy parameter
     */
    emptyMessage(): string;
    /**
     * Updates the number of filters that have been applied in the title
     */
    getPaneCount(): number;
    /**
     * Rebuilds the panes from the start having deleted the old ones
     *
     * @param dataIn data to be used in buildPane
     * @param maintainSelection Whether the current selections are to be
     *   maintained over rebuild
     */
    rebuildPane(dataIn?: any, maintainSelection?: boolean): this;
    /**
     * Resizes the pane based on the layout that is passed in
     *
     * @param layout the layout to be applied to this pane
     */
    resize(layout: string): void;
    /**
     * Sets the listeners for the pane.
     *
     * Having it in it's own function makes it easier to only set them once
     */
    setListeners(): void;
    /**
     * Populates the SearchPane based off of the data that has been received
     * from the server
     *
     * This method is overridden by SearchPaneST
     *
     * @param dataIn The data that has been sent from the server
     */
    _serverPopulate(dataIn: {
        [keys: string]: any;
    }): void;
    /**
     * Expands the pane from the collapsed state
     */
    show(): void;
    /**
     * Finds the ratio of the number of different options in the table to the
     * number of rows
     *
     * @param bins the number of different options in the table
     * @param rowCount the total number of rows in the table
     * @returns {number} returns the ratio
     */
    _uniqueRatio(bins: number, rowCount: number): number;
    /**
     * Updates the panes if one of the options to do so has been set to true
     * rather than the filtered message when using viewTotal.
     */
    updateTable(): void;
    /**
     * Adds the custom options to the pane
     *
     * @returns {Array} Returns the array of rows which have been added to the
     *   pane
     */
    protected _getComparisonRows(): any[];
    protected _getMessage(row: {
        [keys: string]: any;
    }): string;
    /**
     * Overridden in SearchPaneViewTotal and SearchPaneCascade to get the number
     * of times a specific value is shown
     *
     * Here it is blanked so that it takes no action
     *
     * @param filter The filter value
     * @returns undefined
     */
    protected _getShown(filter: any): number | void;
    /**
     * Get's the pane config appropriate to this class
     *
     * @returns The config needed to create a pane of this type
     */
    protected _getPaneConfig(): {
        [keys: string]: any;
    };
    /**
     * This method allows for changes to the panes and table to be made when a
     * selection or a deselection occurs
     */
    protected _makeSelection(): void;
    /**
     * Populates an array with all of the data for the table
     *
     * @param rowIdx The current row index to be compared
     * @param arrayFilter The array that is to be populated with row Details
     * @param settings The DataTable settings object
     * @param bins The bins object that is to be populated with the row counts
     */
    protected _populatePaneArray(rowIdx: number, arrayFilter: any[], settings: Context, bins?: {
        [keys: string]: number;
    }): void;
    /**
     * Reloads all of the previous selects into the panes
     *
     * @param loadedFilter The loaded filters from a previous state
     */
    protected _reloadSelect(loadedFilter: {
        [keys: string]: any;
    }): void;
    /**
     * Notes the rows that have been selected within this pane and stores them
     * internally
     *
     * @param notUpdating Whether the panes are updating themselves or not
     */
    _updateSelection(notUpdating: boolean): void;
    /**
     * Takes in potentially undetected rows and adds them to the array if they
     * are not yet featured
     *
     * @param filter the filter value of the potential row
     * @param display the display value of the potential row
     * @param sort the sort value of the potential row
     * @param type the type value of the potential row
     * @param arrayFilter the array to be populated
     * @param bins the bins to be populated
     */
    private _addOption;
    /**
     * Method to construct the actual pane.
     *
     * @param selectedRows previously selected Rows to be reselected
     * @param dataIn Data that should be used to populate this pane
     * @param prevEl Reference to the previous element, used to ensure insert is
     *   in the correct location
     * @returns boolean to indicate whether this pane was the last one to have a
     *   selection made
     */
    private _buildPane;
    /**
     * Appends all of the HTML elements to their relevant parent Elements
     */
    private _displayPane;
    /**
     * Escape html characters within a string
     *
     * @param txt the string to be escaped
     * @returns the escaped string
     */
    private _escapeHTML;
    /**
     * Gets the options for the row for the customPanes
     *
     * @returns The options for the row extended to include the options
     *   from the user.
     */
    private _getBonusOptions;
    /**
     * Gets the options for the row for the customPanes
     *
     * @returns The options for the row extended to include the options
     *   from the user.
     */
    private _getOptions;
    /**
     * Fill the array with the values that are currently being displayed in the
     * table
     */
    private _populatePane;
    /**
     * This method decides whether a row should contribute to the pane or not
     *
     * @param filter the value that the row is to be filtered on
     * @param dataIndex the row index
     */
    private _search;
    /**
     * Creates the contents of the searchCont div
     *
     * NOTE This is overridden when semantic ui styling in order to integrate
     * the search button into the text box.
     */
    _searchContSetup(): void;
    /**
     * Adds outline to the pane when a selection has been made
     */
    private _searchExtras;
}

declare class SearchPaneST extends SearchPane {
    s: ISST;
    constructor(hostCtx: Context, opts: IConfig, index: number, panesContainer: Dom, panes: IConfigPaneItem | null);
    /**
     * When server-side processing is enabled, SP will remove rows and then
     * readd them, resulting in Select's reference to the last selected cell
     * being lost. This function is provided to update that reference.
     *
     * @returns Function
     */
    _emptyPane(): () => void;
    /**
     * Populates the SearchPane based off of the data that has been received
     * from the server
     *
     * This method overrides SearchPane's _serverPopulate() method
     *
     * @param dataIn The data that has been sent from the server
     */
    _serverPopulate(dataIn: {
        [keys: string]: any;
    }): void;
    /**
     * This method updates the rows and their data within the SearchPanes
     *
     * SearchPaneCascade overrides this method
     */
    updateRows(): void;
    /**
     * Remove functionality from makeSelection - needs to be more advanced when
     * tracking selections
     */
    protected _makeSelection(): void;
    /**
     * Blank method to remove reloading of selected rows - needs to be more
     * advanced when tracking selections
     */
    protected _reloadSelect(): void;
    /**
     * Decides if a row should be added when being added from the server
     *
     * Overridden by SearchPaneCascade
     *
     * @param data the row data
     * @returns boolean indicating if the row should be added or not
     */
    protected _shouldAddRow(data: any): boolean;
    /**
     * Updates the server selection list where appropriate
     */
    _updateSelection(): void;
    /**
     * Used when binning the data for a column
     *
     * @param rowIdx The current row that is to be added to the bins
     * @param settings The DataTables settings object
     * @param bins The bins object that is to be incremented
     */
    protected _updateShown(rowIdx: number, settings: Context, bins?: {
        [keys: string]: number;
    }): void;
}

declare class SearchPaneCascade extends SearchPaneST {
    constructor(hostCtx: Context, opts: IConfig, index: number, panesContainer: Dom, panes: IConfigPaneItem | null);
    /**
     * This method updates the rows and their data within the SearchPanes
     *
     * This overrides the method in SearchPane
     */
    updateRows(): void;
    /**
     * Fill the array with the values that are currently being displayed in the
     * table
     */
    protected _activePopulatePane(): void;
    protected _getComparisonRows(): any[];
    /**
     * Gets the message that is to be used to indicate the count for each
     * SearchPane row
     *
     * This method overrides _getMessage() in SearchPane and is overridden by
     * SearchPaneCascadeViewTotal
     *
     * @param row The row object that is being processed
     * @returns string - the message that is to be shown for the count of each
     * entry
     */
    protected _getMessage(row: {
        [keys: string]: any;
    }): string;
    /**
     * Overrides the blank method in SearchPane to return the number of times a
     * given value is currently being displayed
     *
     * @param filter The filter value
     * @returns number - The number of times the value is shown
     */
    protected _getShown(filter: string): number;
    /**
     * Decides if a row should be added when being added from the server
     *
     * Overrides method in by SearchPaneST
     *
     * @param data the row data
     * @returns boolean indicating if the row should be added or not
     */
    protected _shouldAddRow(data: {
        [keys: string]: any;
    }): boolean;
}

declare class SearchPaneViewTotal extends SearchPaneST {
    constructor(ctxHost: Context, opts: IConfig, index: number, panesContainer: Dom, panes: IConfigPaneItem | null);
    /**
     * Gets the message that is to be used to indicate the count for each
     * SearchPane row
     *
     * This method overrides _getMessage() in SearchPane and is overridden by
     * SearchPaneCascadeViewTotal
     *
     * @param row The row object that is being processed
     * @returns string - the message that is to be shown for the count of each
     * entry
     */
    protected _getMessage(row: any): string;
    /**
     * Overrides the blank method in SearchPane to return the number of times a
     * given value is currently being displayed
     *
     * @param filter The filter value
     * @returns number - The number of times the value is shown
     */
    protected _getShown(filter: any): number;
}

type DeepPartial<T> = T extends (...args: any[]) => any ? T : T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;
interface IClasses {
    clear: string;
    clearAll: string;
    collapseAll: string;
    container: string;
    disabledButton: string;
    emptyMessage: string;
    hide: string;
    panes: string;
    search: string;
    showAll: string;
    title: string;
    titleRow: string;
}
interface IDefaults {
    cascadePanes: boolean;
    clear: boolean;
    collapse: boolean;
    columns: number[];
    container: (dt: any) => any;
    filterChanged?: (this: Api, count: number) => void;
    i18n: {
        clearMessage: string;
        clearPane: string;
        collapse: {
            0: string;
            _: string;
        };
        collapseMessage: string;
        count: string;
        countFiltered: string;
        emptyMessage: string;
        emptyPanes: string;
        loadMessage: string;
        showMessage: string;
        title: string;
    };
    layout: string;
    order: string[];
    panes: IConfigPaneItem[];
    preSelect: ISelectItem[];
    viewCount: boolean;
    viewTotal: boolean;
}
interface IConfig extends DeepPartial<IDefaults> {
}
interface IDOM {
    clearAll: Dom<HTMLElement>;
    collapseAll: Dom<HTMLElement>;
    container: Dom<HTMLElement>;
    emptyMessage: Dom<HTMLElement>;
    panes: Dom<HTMLElement>;
    showAll: Dom<HTMLElement>;
    title: Dom<HTMLElement>;
    titleRow: Dom<HTMLElement>;
}
interface IS {
    colOpts: any[];
    dt: Api;
    filterCount: number;
    minPaneWidth: number;
    page: number;
    paging: boolean;
    pagingST: boolean;
    paneClass: typeof SearchPane;
    panes: SearchPane[];
    selectionList: ISelectItem[];
    serverData: {
        [keys: string]: any;
    };
    stateRead: boolean;
    updating: boolean;
}
interface ISVT extends IS {
    anotherFilter: boolean;
    panes: SearchPaneViewTotal[] | SearchPaneCascade[];
    reselecting: boolean;
    serverSelect: any;
    serverSelecting: any;
    processing: number;
}
interface ISelectItem {
    column: number;
    rows: any;
}

declare class SearchPaneCascadeViewTotal extends SearchPaneCascade {
    constructor(ctxHost: Context, opts: IConfig, index: number, panesContainer: Dom, panes: IConfigPaneItem | null);
    /**
     * Fill the array with the values that are currently being displayed in the table
     *
     * This method overrides _activePopulatePane() in SearchPaneCascade
     */
    protected _activePopulatePane(): void;
    /**
     * Gets the message that is to be used to indicate the count for each SearchPane row
     *
     * This method overrides _getMessage() in SearchPaneCascade
     *
     * @param row The row object that is being processed
     * @returns string - the message that is to be shown for the count of each entry
     */
    protected _getMessage(row: any): string;
}

declare class SearchPanes {
    static version: string;
    static classes: {
        clear: string;
        clearAll: string;
        collapseAll: string;
        container: string;
        disabledButton: string;
        emptyMessage: string;
        hide: string;
        panes: string;
        search: string;
        showAll: string;
        title: string;
        titleRow: string;
    };
    static defaults: IDefaults;
    classes: IClasses;
    dom: IDOM;
    c: IDefaults;
    s: IS;
    constructor(hostCtx: Context, opts: IConfig, fromPreInit?: boolean, paneClass?: typeof SearchPane);
    /**
     * Clear the selections of all of the panes
     */
    clearSelections(): SearchPane[];
    /**
     * returns the container node for the searchPanes
     */
    getNode(): Dom<HTMLElement>;
    /**
     * rebuilds all of the panes
     */
    rebuild(targetIdx?: boolean | number, maintainSelection?: boolean): SearchPane | SearchPane[];
    /**
     * Resizes all of the panes
     */
    resizePanes(): SearchPanes;
    /**
     * Holder method that is userd in SearchPanesST to set listeners that have
     * an effect on other panes
     *
     * @param isPreselect boolean to indicate if the preselect array is to
     * override the current selection list.
     */
    protected _initSelectionListeners(isPreselect: boolean): void;
    /**
     * Blank method that is overridden in SearchPanesST to retrieve the totals
     * from the server data
     */
    protected _serverTotals(): void;
    /**
     * Set's the xhr listener so that SP can extact appropriate data from the
     * response
     */
    protected _setXHR(): void;
    /**
     * Set's the function that is to be performed when a state is loaded
     *
     * Overridden by the method in SearchPanesST
     */
    protected _stateLoadListener(): void;
    /**
     * Updates the selectionList when cascade is not in place
     *
     * Overridden in SearchPanesST
     */
    protected _updateSelection(): void;
    /**
     * Attach the panes, buttons and title to the document
     */
    private _attach;
    /**
     * If there are no panes to display then this method is called to either
     * display a message in their place or hide them completely.
     */
    private _attachMessage;
    /**
     * Attaches the panes to the document and displays a message or hides if
     * there are none
     */
    protected _attachPaneContainer(): void;
    /**
     * Checks which panes are collapsed and then performs relevant actions to
     * the collapse/show all buttons
     */
    private _checkCollapse;
    /**
     * Attaches the message to the document but does not add any panes
     */
    private _checkMessage;
    /**
     * Collapses all of the panes
     */
    private _collapseAll;
    /**
     * Finds a pane based upon the name of that pane
     *
     * @param name string representing the name of the pane
     * @returns SearchPane The pane which has that name
     */
    private _findPane;
    /**
     * Gets the selection list from the previous state and stores it in the
     * selectionList Property
     */
    private _getState;
    private _makeSelections;
    /**
     * Declares the instances of individual searchpanes dependant on the number
     * of columns. It is necessary to run this once preInit has completed
     * otherwise no panes will be created as the column count will be 0.
     *
     * @param table the DataTable api for the parent table
     * @param paneSettings the settings passed into the constructor
     * @param opts the options passed into the constructor
     */
    private _paneDeclare;
    /**
     * Sets the listeners for the collapse and show all buttons. Also sets and
     * performs checks on current panes to see if they are collapsed
     */
    private _setCollapseListener;
    /**
     * Shows all of the panes
     */
    private _showAll;
    /**
     * Initialises the tables previous/preset selections and initialises
     * callbacks for events
     *
     * @param table the parent table for which the searchPanes are being created
     */
    private _startup;
    /**
     * Updates the number of filters that have been applied in the title
     */
    protected _updateFilterCount(): void;
}

declare class SearchPanesST extends SearchPanes {
    s: ISVT;
    constructor(hostCtx: Context, opts: IConfig, fromPreInit?: boolean);
    /**
     * Ensures that the correct selection listeners are set for selection
     * tracking
     *
     * @param preSelect Any values that are to be preselected
     */
    protected _initSelectionListeners(isPreselect?: boolean, preSelect?: ISelectItem[]): void;
    /**
     * Retrieve the total values from the server data
     */
    protected _serverTotals(): void;
    /**
     * Set's the function that is to be performed when a state is loaded
     *
     * Overrides the method in SearchPanes
     */
    protected _stateLoadListener(): void;
    /**
     * Remove the function's actions when using cascade
     *
     * Overrides the method in SearchPanes
     */
    protected _updateSelection(): void;
    /**
     * Returns a function that updates the selection list based on a specific
     * pane Also clears the timeout to stop the deselect from running
     *
     * @param pane the pane that is to have it's selections loaded
     */
    private _update;
    /**
     * Returns a function that updates the selection list based on a specific
     * pane Also sets a timeout in case a select is about to be made
     *
     * @param pane the pane that is to have it's selections loaded
     */
    private _updateTimeout;
    /**
     * Updates the selection list to include the latest selections for a given
     * pane
     *
     * @param index The index of the pane that is to be updated
     * @param selected Which rows are selected within the pane
     */
    private _updateSelectionList;
    /**
     * Remake the selections that were present before new data or calculations
     * have occurred
     */
    private _remakeSelections;
}

declare module 'datatables.net' {
    interface Options {
        /**
         * SearchPanes extension options
         */
        searchPanes?: boolean | string[] | IConfig | IConfig[];
    }
    interface ColumnOptions {
        /**
         * SearchPanes extension options
         */
        searchPanes?: SPColumnOptions;
    }
    interface Defaults {
        /**
         * SearchPanes defaults
         */
        searchPanes?: IConfig;
    }
    interface Language {
        /**
         * SearchPanes language options
         */
        searchPanes?: IConfig['i18n'];
    }
    interface Feature {
        searchPanes?: boolean | string[] | IConfig | IConfig[];
    }
    interface Context {
        /**
         * SearchPanes instance
         */
        _searchPanes: SearchPanes;
    }
    interface ColumnContext {
        /**
         * SearchPanes instance
         */
        searchPanes: IConfig;
    }
    interface Api<T> {
        /**
         * SearchPanes methods container
         *
         * @returns Api for chaining with the additional SearchPanes methods
         */
        searchPanes: ApiSearchPanes<T>;
    }
    interface DataTablesStatic {
        /**
         * SearchPanes class
         */
        SearchPanes: typeof SearchPanes;
        /** @deprecated */
        SearchPanesST: typeof SearchPanesST;
        /**
         * Individual SearchPane class
         */
        SearchPane: typeof SearchPane;
        /** @deprecated */
        SearchPaneViewTotal: typeof SearchPaneViewTotal;
        /** @deprecated */
        SearchPaneCascade: typeof SearchPaneCascade;
        /** @deprecated */
        SearchPaneCascadeViewTotal: typeof SearchPaneCascadeViewTotal;
    }
    interface Buttons {
        /** SearchPanes button */
        searchPanes: {
            extend: 'searchPanes';
            /**
             * Configuration object
             */
            config: IConfig;
            /**
             * Delay initialisation of SearchPanes until the button is
             * activated.
             */
            delayInit?: boolean;
            /**
             * Button text
             */
            text?: string;
            /**
             * Internal reference to the SearchPanes instance for this instance
             *
             * @ignore
             */
            _panes: SearchPanes;
        };
    }
    interface AjaxData {
        /** SearchPanes selections */
        searchPanes: {
            [name: string]: {
                [id: string]: string;
            };
        };
        /** Null values */
        searchPanes_null: {
            [name: string]: {
                [id: string]: boolean;
            };
        };
        searchPanesLast?: string | number;
        searchPanes_options: {
            cascade: boolean;
            viewCount: boolean;
            viewTotal: boolean;
        };
    }
    interface AjaxResponse {
        searchPanes: {
            options: any;
        };
    }
    interface State {
        searchPanes: any;
    }
    interface StateLoad {
        searchPanes: {
            selectionList: any;
            panes: Array<{
                collapsed: boolean;
                id: number;
                searchTerm: string;
                order: Order;
            }>;
        };
    }
}
interface ApiSearchPanes<T> {
    /**
     * Clears the selections in all of the panes
     *
     * @returns Self for chaining
     */
    clearSelections(): ApiSearchPanes<T>;
    /**
     * Returns the node of the panes container.
     *
     * @returns Dom instance that contains the SearchPanes container
     */
    container(): Dom;
    /**
     * Rebuilds the SearchPanes, regathering the options from the table.
     *
     * @param index The index of a specific pane to rebuild
     * @param maintainSelect  Whether to remake the selections once the pane has
     *   been rebuilt.
     * @returns Self for chaining
     */
    rebuildPane(index?: number, maintainSelect?: boolean): ApiSearchPanes<T>;
    /**
     * Resize all of the SearchPanes to fill the container appropriately.
     *
     * @returns Self for chaining
     */
    resizePanes(): ApiSearchPanes<T>;
}
