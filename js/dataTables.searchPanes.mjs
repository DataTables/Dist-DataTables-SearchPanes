/*! SearchPanes 3.0.0 for DataTables
 * Copyright (c) SpryMedia Ltd - https://datatables.net/license/plus
 */

import DataTable, { util, Dom, Api } from 'datatables.net';

class SearchPane {
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
    constructor(hostCtx, opts, index, panesContainer, panes = null) {
        var _a;
        let table = new DataTable.Api(hostCtx);
        DataTable.plus('2026-10-22');
        this.classes = util.object.assignDeep({}, SearchPane.classes);
        // Get options from user
        this.c = util.object.assignDeep({}, SearchPane.defaults, opts, panes || {});
        // Legacy
        if (opts && opts.hideCount && opts.viewCount === undefined) {
            this.c.viewCount = !this.c.hideCount;
        }
        let rowLength = table.columns().eq(0).toArray().length;
        this.s = {
            colExists: index < rowLength,
            colOpts: {},
            customPaneSettings: panes,
            displayed: false,
            dt: table,
            dtPane: null,
            firstSet: true,
            index,
            indexes: [],
            listSet: false,
            name: '',
            rowData: {
                arrayFilter: [],
                arrayOriginal: [],
                bins: {},
                binsOriginal: {},
                filterMap: new Map(),
                totalOptions: 0
            },
            scrollTop: 0,
            searchFunction: undefined,
            selections: [],
            serverSelect: [],
            serverSelecting: false,
            tableLength: 0,
            updating: false
        };
        this.s.colOpts = this.s.colExists
            ? this._getOptions()
            : this._getBonusOptions();
        this.dom = {
            buttonGroup: Dom.c('div').classAdd(this.classes.buttonGroup),
            clear: Dom.c('button')
                .attr('type', 'button')
                .html('&#215;')
                .attr('disabled', 'true')
                .classAdd(this.classes.disabledButton)
                .classAdd(this.classes.paneButton)
                .classAdd(this.classes.clearButton)
                .attr('aria-label', table.i18n('searchPanes.buttons.clearPane', this.c.i18n.aria.clearPane))
                .html(this.s.dt.i18n('searchPanes.clearPane', this.c.i18n.clearPane)),
            collapseButton: Dom.c('button')
                .attr('type', 'button')
                .append(Dom.c('span').classAdd(this.classes.caret).html('&#x5e;'))
                .classAdd(this.classes.paneButton)
                .classAdd(this.classes.collapseButton)
                .attr('aria-label', table.i18n('searchPanes.buttons.collapse', this.c.i18n.aria.collapse)),
            container: Dom.c('div')
                .classAdd(this.classes.container)
                .classAdd(this.s.colOpts.className)
                .classAdd(this.classes.layout +
                (parseInt(this.c.layout.split('-')[1], 10) < 10
                    ? this.c.layout
                    : this.c.layout.split('-')[0] + '-9'))
                .classAdd(this.s.customPaneSettings &&
                this.s.customPaneSettings.className
                ? this.s.customPaneSettings.className
                : ''),
            countButton: Dom.c('button')
                .attr('type', 'button')
                .append(Dom.c('span'))
                .classAdd(this.classes.paneButton)
                .classAdd(this.classes.countButton)
                .attr('aria-label', table.i18n('searchPanes.buttons.orderByCount', this.c.i18n.aria.orderByCount)),
            dtP: Dom.c('table')
                .css('width', '100%')
                .append(Dom.c('thead').append(Dom.c('tr').append(Dom.c('th')).append(Dom.c('th')))),
            lower: Dom.c('div')
                .classAdd(this.classes.subRow2)
                .classAdd(this.classes.narrowButton),
            nameButton: Dom.c('button')
                .attr('type', 'button')
                .append(Dom.c('span'))
                .classAdd(this.classes.paneButton)
                .classAdd(this.classes.nameButton)
                .attr('aria-label', table.i18n('searchPanes.buttons.orderByLabel', this.c.i18n.aria.orderByLabel)),
            panesContainer: Dom.s(panesContainer),
            searchBox: Dom.c('input')
                .classAdd(this.classes.paneInputButton)
                .classAdd(this.classes.search),
            searchButton: Dom.c('button')
                .attr('type', 'button')
                .append(Dom.c('span'))
                .classAdd(this.classes.searchIcon)
                .classAdd(this.classes.paneButton)
                .attr('aria-label', table.i18n('searchPanes.buttons.clearSearch', this.c.i18n.aria.clearSearch)),
            searchCont: Dom.c('div').classAdd(this.classes.searchCont),
            searchLabelCont: Dom.c('div').classAdd(this.classes.searchLabelCont),
            topRow: Dom.c('div').classAdd(this.classes.topRow),
            upper: Dom.c('div')
                .classAdd(this.classes.subRow1)
                .classAdd(this.classes.narrowSearch)
        };
        var title = '';
        if (this.s.colExists) {
            title = Dom.s(this.s.dt.column(this.s.index).header()).text();
            this.dom.dtP.find('th').eq(0).text(title);
        }
        else {
            title = ((_a = this.s.customPaneSettings) === null || _a === void 0 ? void 0 : _a.header) || 'Custom Pane';
            this.dom.dtP.find('th').eq(0).html(title);
        }
        // Set the value of name in case ordering is desired
        if (this.s.colOpts.name) {
            this.s.name = this.s.colOpts.name;
        }
        else if (this.s.customPaneSettings && this.s.customPaneSettings.name) {
            this.s.name = this.s.customPaneSettings.name;
        }
        else {
            this.s.name = title;
        }
        let tableNode = this.s.dt.table(0).node();
        // Custom search function for table
        this.s.searchFunction = (settings, searchData, dataIndex) => {
            var _a;
            // If no data has been selected then show all
            if (this.s.selections.length === 0) {
                return true;
            }
            if (settings.table !== tableNode) {
                return true;
            }
            let filter = '';
            if (this.s.colExists) {
                // Get the current filtered data
                filter = searchData[this.s.index];
                if (((_a = this.s.colOpts.orthogonal) === null || _a === void 0 ? void 0 : _a.filter) !== 'filter') {
                    // get the filter value from the map
                    filter = this.s.rowData.filterMap.get(dataIndex);
                    if (filter instanceof DataTable.Api) {
                        filter = filter.toArray();
                    }
                }
            }
            return this._search(filter, dataIndex);
        };
        DataTable.ext.search.push(this.s.searchFunction);
        // If the clear button for this pane is clicked clear the selections
        if (this.c.clear) {
            this.dom.clear.on('click.dtsp', () => {
                let searches = this.dom.container.find('.' + this.classes.search.replace(/\s+/g, '.'));
                searches.each(el => {
                    Dom.s(el).val('').trigger('input');
                });
                this.clearPane();
            });
        }
        // Sometimes the top row of the panes containing the search box and
        // ordering buttons appears weird if the width of the panes is lower
        // than expected, this fixes the design. Equally this may occur when the
        // table is resized.
        this.s.dt.on('draw.dtsp', () => this.adjustTopRow());
        this.s.dt.on('buttons-action.dtsp', () => this.adjustTopRow());
        // When column-reorder is present and the columns are moved, it is
        // necessary to reassign all of the panes indexes to the new index of
        // the column.
        this.s.dt.on('column-reorder.dtsp', (e, settings, details) => {
            this.s.index = details.mapping[this.s.index];
        });
        return this;
    }
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
    addRow(display, filter, sort, type, className, total, shown) {
        if (!total) {
            total = this.s.rowData.bins[filter]
                ? this.s.rowData.bins[filter]
                : 0;
        }
        if (!shown) {
            shown = this._getShown(filter);
        }
        let index;
        for (let entry of this.s.indexes) {
            if (entry.filter === filter) {
                index = entry.index;
            }
        }
        if (index === undefined) {
            index = this.s.indexes.length;
            this.s.indexes.push({ filter, index });
        }
        return this.s.dtPane.row.add({
            className,
            display: display !== '' ? display : this.emptyMessage(),
            filter,
            index,
            shown,
            sort,
            total,
            type
        });
    }
    /**
     * Adjusts the layout of the top row when the screen is resized
     */
    adjustTopRow() {
        let subContainers = this.dom.container.find('.' + this.classes.subRowsContainer.replace(/\s+/g, '.'));
        let subRow1 = this.dom.container.find('.' + this.classes.subRow1.replace(/\s+/g, '.'));
        let subRow2 = this.dom.container.find('.' + this.classes.subRow2.replace(/\s+/g, '.'));
        let topRow = this.dom.container.find('.' + this.classes.topRow.replace(/\s+/g, '.'));
        // If the width is 0 then it is safe to assume that the pane has not yet
        // been displayed. Even if it has, if the width is 0 it won't make a
        // difference if it has the narrow class or not
        if ((Dom.s(subContainers[0]).width() < 252 ||
            Dom.s(topRow[0]).width() < 252) &&
            Dom.s(subContainers[0]).width() !== 0) {
            Dom.s(subContainers[0]).classAdd(this.classes.narrow);
            Dom.s(subRow1[0])
                .classAdd(this.classes.narrowSub)
                .classRemove(this.classes.narrowSearch);
            Dom.s(subRow2[0])
                .classAdd(this.classes.narrowSub)
                .classRemove(this.classes.narrowButton);
        }
        else {
            Dom.s(subContainers[0]).classRemove(this.classes.narrow);
            Dom.s(subRow1[0])
                .classRemove(this.classes.narrowSub)
                .classAdd(this.classes.narrowSearch);
            Dom.s(subRow2[0])
                .classRemove(this.classes.narrowSub)
                .classAdd(this.classes.narrowButton);
        }
    }
    /**
     * In the case of a rebuild there is potential for new data to have been
     * included or removed so all of the rowData must be reset as a precaution.
     */
    clearData() {
        this.s.rowData = {
            arrayFilter: [],
            arrayOriginal: [],
            bins: {},
            binsOriginal: {},
            filterMap: new Map(),
            totalOptions: 0
        };
    }
    /**
     * Clear the selections in the pane
     */
    clearPane() {
        // Deselect all rows which are selected and update the table and filter
        // count.
        this.s.dtPane.rows({ selected: true }).deselect();
        this.updateTable();
        return this;
    }
    /**
     * Collapses the pane so that only the header is displayed
     */
    collapse() {
        if (!this.s.dtPane ||
            !this.s.displayed ||
            // If collapsing is disabled globally, and not enabled specifically
            // for this column
            (!this.c.collapse && this.s.colOpts.collapse !== true) ||
            // OR, collapsing could be enabled globally and this column
            // specifically is not to be collapsed. We can't just take
            // !this.s.colOpts.collapse here as if it is undefined then the
            // global should be used
            this.s.colOpts.collapse === false) {
            return;
        }
        Dom.s(this.s.dtPane.table().container()).classAdd(this.classes.hidden);
        this.dom.topRow.classAdd(this.classes.bordered);
        this.dom.nameButton.classAdd(this.classes.disabledButton);
        this.dom.countButton.classAdd(this.classes.disabledButton);
        this.dom.searchButton.classAdd(this.classes.disabledButton);
        this.dom.collapseButton.classAdd(this.classes.rotated);
        this.dom.topRow.one('click.dtsp', () => this.show());
        this.dom.topRow.trigger('collapse.dtsps');
    }
    /**
     * Strips all of the SearchPanes elements from the document and turns all of
     * the listeners for the buttons off
     */
    destroy() {
        if (this.s.dtPane) {
            this.s.dtPane.off('.dtsp');
        }
        this.s.dt.off('.dtsp');
        this.dom.clear.off('.dtsp');
        this.dom.nameButton.off('.dtsp');
        this.dom.countButton.off('.dtsp');
        this.dom.searchButton.off('.dtsp');
        this.dom.collapseButton.off('.dtsp');
        Dom.s(this.s.dt.table().node()).off('.dtsp');
        this.dom.container.detach();
        let searchIdx = DataTable.ext.search.indexOf(this.s.searchFunction);
        while (searchIdx !== -1) {
            DataTable.ext.search.splice(searchIdx, 1);
            searchIdx = DataTable.ext.search.indexOf(this.s.searchFunction);
        }
        // If the DataTables have been defined for the panes then also destroy
        // these
        if (this.s.dtPane) {
            this.s.dtPane.destroy();
        }
        this.s.listSet = false;
    }
    /**
     * Getting the legacy message is a little complex due a legacy parameter
     */
    emptyMessage() {
        let def = this.c.i18n.emptyMessage;
        // Legacy parameter support
        if (this.c.emptyMessage) {
            def = this.c.emptyMessage;
        }
        // Override per column
        if (this.s.colOpts.emptyMessage) {
            def = this.s.colOpts.emptyMessage;
        }
        return this.s.dt.i18n('searchPanes.emptyMessage', def);
    }
    /**
     * Updates the number of filters that have been applied in the title
     */
    getPaneCount() {
        return this.s.dtPane
            ? this.s.dtPane.rows({ selected: true }).data().toArray().length
            : 0;
    }
    /**
     * Rebuilds the panes from the start having deleted the old ones
     *
     * @param dataIn data to be used in buildPane
     * @param maintainSelection Whether the current selections are to be
     *   maintained over rebuild
     */
    rebuildPane(dataIn = null, maintainSelection = false) {
        this.clearData();
        let selectedRows = [];
        this.s.serverSelect = [];
        let prevEl = null;
        // When rebuilding strip all of the HTML Elements out of the container
        // and start from scratch
        if (this.s.dtPane) {
            if (maintainSelection) {
                if (!this.s.dt.page.info().serverSide) {
                    selectedRows = this.s.dtPane
                        .rows({ selected: true })
                        .data()
                        .toArray();
                }
                else {
                    this.s.serverSelect = this.s.dtPane
                        .rows({ selected: true })
                        .data()
                        .toArray();
                }
            }
            this.s.dtPane.clear().destroy();
            prevEl = this.dom.container[0].previousElementSibling;
            this.destroy();
            this.s.dtPane = null;
            DataTable.ext.search.push(this.s.searchFunction);
        }
        this.dom.container.classRemove(this.classes.hidden);
        this.s.displayed = false;
        this._buildPane(!this.s.dt.page.info().serverSide
            ? selectedRows
            : this.s.serverSelect, dataIn, prevEl);
        return this;
    }
    /**
     * Resizes the pane based on the layout that is passed in
     *
     * @param layout the layout to be applied to this pane
     */
    resize(layout) {
        this.c.layout = layout;
        this.dom.container
            .classRemove()
            .classAdd(this.classes.show)
            .classAdd(this.classes.container)
            .classAdd(this.s.colOpts.className)
            .classAdd(this.classes.layout +
            (parseInt(layout.split('-')[1], 10) < 10
                ? layout
                : layout.split('-')[0] + '-9'))
            .classAdd(this.s.customPaneSettings !== null &&
            this.s.customPaneSettings.className
            ? this.s.customPaneSettings.className
            : '');
        this.adjustTopRow();
        // Force the width for the table to be 100% - the use of flexbox for the
        // content in each row makes this difficult as the content will expand
        // to fit it, causing the host table to widen and we need to force it
        // smaller.
        this.dom.dtP.css('table-layout', 'fixed');
        this.dom.dtP.css('width', '100%');
        this.dom.dtP.find('colgroup col').css('width', '100%');
    }
    /**
     * Sets the listeners for the pane.
     *
     * Having it in it's own function makes it easier to only set them once
     */
    setListeners() {
        if (!this.s.dtPane) {
            return;
        }
        // When an item is selected on the pane, add these to the array which
        // holds selected items. Custom search will perform.
        this.s.dtPane.off('select.dtsp').on('select.dtsp', () => {
            clearTimeout(this.s.deselectTimeout);
            this._updateSelection(!this.s.updating);
            this.dom.clear
                .classRemove(this.classes.disabledButton)
                .attrRemove('disabled');
        });
        // When an item is deselected on the pane, re add the currently selected
        // items to the array which holds selected items. Custom search will be
        // performed.
        this.s.dtPane.off('deselect.dtsp').on('deselect.dtsp', () => {
            this.s.deselectTimeout = setTimeout(() => {
                if (!this.s.dtPane) {
                    return;
                }
                this._updateSelection(true);
                if (this.s.dtPane.rows({ selected: true }).data().toArray()
                    .length === 0) {
                    this.dom.clear
                        .classAdd(this.classes.disabledButton)
                        .attr('disabled', 'true');
                }
            }, 50);
        });
        // If we attempt to turn off this event then it will ruin behaviour in
        //  other panes so need to make sure that it is only done once
        if (this.s.firstSet) {
            this.s.firstSet = false;
            // When saving the state store all of the selected rows for
            // preselection next time around
            this.s.dt.on('stateSaveParams.dtsp', (e, settings, data) => {
                // If the data being passed in is empty then state clear must
                // have occurred so clear the panes state as well
                if (this.s.dtPane && Object.keys(data).length === 0) {
                    this.s.dtPane.state.clear();
                    return;
                }
                let bins = {};
                let order;
                let selected = [];
                let collapsed = false;
                let searchTerm = '';
                let arrayFilter = [];
                // Get all of the data needed for the state save from the pane
                if (this.s.dtPane) {
                    selected = this.s.dtPane
                        .rows({ selected: true })
                        .data()
                        .map(item => item.filter !== null ? item.filter.toString() : null)
                        .toArray();
                    searchTerm = this.dom.searchBox.val();
                    order = this.s.dtPane.order();
                    bins = this.s.rowData.binsOriginal;
                    arrayFilter = this.s.rowData.arrayOriginal;
                    collapsed = this.dom.collapseButton.classHas(this.classes.rotated);
                }
                if (data.searchPanes === undefined) {
                    data.searchPanes = {};
                }
                if (data.searchPanes.panes === undefined) {
                    data.searchPanes.panes = [];
                }
                for (let i = 0; i < data.searchPanes.panes.length; i++) {
                    if (data.searchPanes.panes[i].id === this.s.index) {
                        data.searchPanes.panes.splice(i, 1);
                        i--;
                    }
                }
                // Add the panes data to the state object
                data.searchPanes.panes.push({
                    arrayFilter,
                    bins,
                    collapsed,
                    id: this.s.index,
                    order,
                    searchTerm,
                    selected
                });
            });
        }
        this.s.dtPane
            .off('user-select.dtsp')
            .on('user-select.dtsp', (e, _dt, type, cell, originalEvent) => {
            originalEvent.stopPropagation();
        });
        this.s.dtPane
            .off('draw.dtsp')
            .on('draw.dtsp', () => this.adjustTopRow());
        // When the button to order by the name of the options is clicked then
        //  change the ordering to whatever it isn't currently
        this.dom.nameButton.off('click.dtsp').on('click.dtsp', () => {
            if (!this.s.dtPane) {
                return;
            }
            let currentOrder = this.s.dtPane.order()[0][1];
            this.s.dtPane
                .order([[0, currentOrder === 'asc' ? 'desc' : 'asc']])
                .draw();
            // This state save is required so that the ordering of the panes is
            // maintained
            this.s.dt.state.save();
        });
        // When the button to order by the number of entries in the column is
        //  clicked then change the ordering to whatever it isn't currently
        this.dom.countButton.off('click.dtsp').on('click.dtsp', () => {
            if (!this.s.dtPane) {
                return;
            }
            let currentOrder = this.s.dtPane.order()[0][1];
            let dir = currentOrder === 'asc' ? 'desc' : 'asc';
            this.s.dtPane
                .order([
                [2, dir],
                [1, dir]
            ])
                .draw();
            // This state save is required so that the ordering of the panes is
            // maintained
            this.s.dt.state.save();
        });
        // When the button to order by the number of entries in the column is
        //  clicked then change the ordering to whatever it isn't currently
        this.dom.collapseButton.off('click.dtsp').on('click.dtsp', e => {
            e.stopPropagation();
            if (!this.s.dtPane) {
                return;
            }
            let container = Dom.s(this.s.dtPane.table().container());
            // Toggle the classes
            container.classToggle(this.classes.hidden);
            this.dom.topRow.classToggle(this.classes.bordered);
            this.dom.nameButton.classToggle(this.classes.disabledButton);
            this.dom.countButton.classToggle(this.classes.disabledButton);
            this.dom.searchButton.classToggle(this.classes.disabledButton);
            this.dom.collapseButton.classToggle(this.classes.rotated);
            if (container.classHas(this.classes.hidden)) {
                this.dom.topRow.on('click.dtsp', () => this.dom.collapseButton.trigger('click'));
            }
            else {
                this.dom.topRow.off('click.dtsp');
            }
            this.s.dt.state.save();
            this.dom.topRow.trigger('collapse.dtsps');
        });
        // When the clear button is clicked reset the pane
        this.dom.clear.off('click.dtsp').on('click.dtsp', () => {
            let searches = this.dom.container.find('.' + this.classes.search.replace(/ /g, '.'));
            searches.each(el => {
                // set the value of the search box to be an empty string and
                // then search on that, effectively resetting
                Dom.s(el).val('').trigger('input');
            });
            this.clearPane();
        });
        // When the search button is clicked then draw focus to the search box
        this.dom.searchButton
            .off('click.dtsp')
            .on('click.dtsp', () => this.dom.searchBox.focus());
        // When a character is inputted into the searchbox search the pane for
        // matching values. Doing it this way means that no button has to be
        // clicked to trigger a search, it is done asynchronously
        this.dom.searchBox.off('click.dtsp').on('input.dtsp', () => {
            if (!this.s.dtPane) {
                return;
            }
            let searchVal = this.dom.searchBox.val();
            this.s.dtPane.search(searchVal).draw();
            if (typeof searchVal === 'string' &&
                (searchVal.length > 0 ||
                    (searchVal.length === 0 &&
                        this.s.dtPane.rows({ selected: true }).data().toArray()
                            .length > 0))) {
                this.dom.clear
                    .classRemove(this.classes.disabledButton)
                    .attrRemove('disabled');
            }
            else {
                this.dom.clear
                    .classAdd(this.classes.disabledButton)
                    .attr('disabled', 'true');
            }
            // This state save is required so that the searching on the panes is
            // maintained
            this.s.dt.state.save();
        });
        let colDtOpts = this.s.colOpts.dtOpts;
        this.s.dtPane.select.style(colDtOpts && colDtOpts.select && colDtOpts.select.style
            ? colDtOpts.select.style
            : this.c.dtOpts &&
                this.c.dtOpts.select &&
                this.c.dtOpts.select.style
                ? this.c.dtOpts.select.style
                : 'os');
    }
    /**
     * Populates the SearchPane based off of the data that has been received
     * from the server
     *
     * This method is overridden by SearchPaneST
     *
     * @param dataIn The data that has been sent from the server
     */
    _serverPopulate(dataIn) {
        if (dataIn.tableLength) {
            this.s.tableLength = dataIn.tableLength;
            this.s.rowData.totalOptions = this.s.tableLength;
        }
        else if (this.s.tableLength === null ||
            this.s.dt.rows()[0].length > this.s.tableLength) {
            this.s.tableLength = this.s.dt.rows()[0].length;
            this.s.rowData.totalOptions = this.s.tableLength;
        }
        let colTitle = this.s.dt.column(this.s.index).dataSrc().toString();
        // If there is SP data for this column add it to the data array and bin
        if (dataIn.searchPanes.options[colTitle]) {
            for (let dataPoint of dataIn.searchPanes.options[colTitle]) {
                this.s.rowData.arrayFilter.push({
                    display: dataPoint.label,
                    filter: dataPoint.value,
                    sort: dataPoint.label,
                    type: dataPoint.label
                });
                this.s.rowData.bins[dataPoint.value] = dataPoint.total;
            }
        }
        let binLength = Object.keys(this.s.rowData.bins).length;
        let uniqueRatio = this._uniqueRatio(binLength, this.s.tableLength);
        // Don't show the pane if there isn't enough variance in the data, or
        // there is only 1 entry for that pane
        if (this.s.displayed === false &&
            ((this.s.colOpts.show === undefined &&
                this.s.colOpts.threshold === null
                ? uniqueRatio > this.c.threshold
                : this.s.colOpts.threshold &&
                    uniqueRatio > this.s.colOpts.threshold) ||
                (this.s.colOpts.show !== true && binLength <= 1))) {
            this.dom.container.classAdd(this.classes.hidden);
            this.s.displayed = false;
            return;
        }
        // Store the original data
        this.s.rowData.arrayOriginal = this.s.rowData.arrayFilter;
        this.s.rowData.binsOriginal = this.s.rowData.bins;
        // Flag this pane as being displayed
        this.s.displayed = true;
    }
    /**
     * Expands the pane from the collapsed state
     */
    show() {
        if (!this.s.displayed || !this.s.dtPane) {
            return;
        }
        this.dom.topRow.classRemove(this.classes.bordered);
        this.dom.nameButton.classRemove(this.classes.disabledButton);
        this.dom.countButton.classRemove(this.classes.disabledButton);
        this.dom.searchButton.classRemove(this.classes.disabledButton);
        this.dom.collapseButton.classRemove(this.classes.rotated);
        Dom.s(this.s.dtPane.table().container()).classRemove(this.classes.hidden);
        this.dom.topRow.trigger('collapse.dtsps');
    }
    /**
     * Finds the ratio of the number of different options in the table to the
     * number of rows
     *
     * @param bins the number of different options in the table
     * @param rowCount the total number of rows in the table
     * @returns {number} returns the ratio
     */
    _uniqueRatio(bins, rowCount) {
        if (rowCount > 0 &&
            ((this.s.rowData.totalOptions > 0 &&
                !this.s.dt.page.info().serverSide) ||
                (this.s.dt.page.info().serverSide && this.s.tableLength > 0))) {
            return bins / this.s.rowData.totalOptions;
        }
        return 1;
    }
    /**
     * Updates the panes if one of the options to do so has been set to true
     * rather than the filtered message when using viewTotal.
     */
    updateTable() {
        if (!this.s.dtPane) {
            return;
        }
        let selectedRows = this.s.dtPane
            .rows({ selected: true })
            .data()
            .toArray()
            .map(el => el.filter);
        this.s.selections = selectedRows;
        this._searchExtras();
    }
    /**
     * Adds the custom options to the pane
     *
     * @returns {Array} Returns the array of rows which have been added to the
     *   pane
     */
    _getComparisonRows() {
        if (!this.s.dtPane) {
            return [];
        }
        // Find the appropriate options depending on whether this is a pane for
        // a specific column or a custom pane
        let options = this.s.colOpts.options
            ? this.s.colOpts.options
            : this.s.customPaneSettings && this.s.customPaneSettings.options
                ? this.s.customPaneSettings.options
                : undefined;
        if (options === undefined) {
            return [];
        }
        let allRows = this.s.dt.rows();
        let tableValsTotal = allRows.data().toArray();
        let rows = [];
        // Clear all of the other rows from the pane, only custom options are to
        // be displayed when they are defined
        this.s.dtPane.clear();
        this.s.indexes = [];
        for (let comp of options) {
            // Initialise the object which is to be placed in the row
            let insert = comp.label !== '' ? comp.label : this.emptyMessage();
            let comparisonObj = {
                className: comp.className,
                display: insert,
                filter: typeof comp.value === 'function'
                    ? comp.value
                    : [],
                sort: comp.order !== undefined ? comp.order : insert,
                total: 0,
                type: insert
            };
            // If a custom function is in place
            if (typeof comp.value === 'function') {
                // Count the number of times the function evaluates to true for
                // the original data in the Table
                for (let i = 0; i < tableValsTotal.length; i++) {
                    if (comp.value.call(this.s.dt, tableValsTotal[i], allRows[0][i])) {
                        comparisonObj.total++;
                    }
                }
                // Update the comparisonObj
                if (typeof comparisonObj.filter !== 'function' && comp.filter) {
                    comparisonObj.filter.push(comp.filter);
                }
            }
            rows.push(this.addRow(comparisonObj.display, comparisonObj.filter, comparisonObj.sort, comparisonObj.type, comparisonObj.className, comparisonObj.total));
        }
        return rows;
    }
    _getMessage(row) {
        return this.s.dt
            .i18n('searchPanes.count', this.c.i18n.count)
            .replace(/{total}/g, row.total);
    }
    /**
     * Overridden in SearchPaneViewTotal and SearchPaneCascade to get the number
     * of times a specific value is shown
     *
     * Here it is blanked so that it takes no action
     *
     * @param filter The filter value
     * @returns undefined
     */
    _getShown(filter) {
        // no op
    }
    /**
     * Get's the pane config appropriate to this class
     *
     * @returns The config needed to create a pane of this type
     */
    _getPaneConfig() {
        // eslint-disable-next-line no-extra-parens
        let haveScroller = DataTable.Scroller;
        let langOpts = this.s.dt.settings()[0].language;
        langOpts.url = '';
        return {
            data: [],
            columnDefs: [
                {
                    className: 'dtsp-nameColumn',
                    data: 'display',
                    render: (data, type, row) => {
                        if (type === 'sort') {
                            return row.sort;
                        }
                        else if (type === 'type') {
                            return row.type;
                        }
                        let message = this._getMessage(row);
                        // We are displaying the count in the same column as
                        // the name of the search option. This is so that there
                        // is not need to call columns.adjust() which in turn
                        // speeds up the code
                        let pill = '<span class="' +
                            this.classes.pill +
                            '">' +
                            message +
                            '</span>';
                        if (!this.c.viewCount || !this.s.colOpts.viewCount) {
                            pill = '';
                        }
                        if (type === 'filter') {
                            return typeof data === 'string'
                                ? util.stripHtml(data)
                                : data;
                        }
                        return ('<div class="' +
                            this.classes.nameCont +
                            '"><span title="' +
                            (typeof data === 'string'
                                ? util.stripHtml(data)
                                : data) +
                            '" class="' +
                            this.classes.name +
                            '">' +
                            data +
                            '</span>' +
                            pill +
                            '</div>');
                    },
                    targets: 0,
                    // Accessing the private DataTables property to set type
                    // based on the original table. This is null if not defined
                    // by the user, meaning that automatic type detection would
                    // take place
                    type: this.s.dt.settings()[0].columns[this.s.index]
                        ? this.s.dt.settings()[0].columns[this.s.index]
                            .typeManual
                        : null
                },
                {
                    className: 'dtsp-countColumn ' + this.classes.badgePill,
                    data: 'total',
                    searchable: false,
                    targets: 1,
                    visible: false
                },
                {
                    data: 'shown',
                    searchable: false,
                    targets: 2,
                    visible: false,
                    defaultContent: 0
                }
            ],
            deferRender: true,
            info: false,
            language: langOpts,
            paging: haveScroller ? true : false,
            scrollX: false,
            scrollY: '200px',
            scroller: haveScroller ? true : false,
            select: true,
            stateSave: this.s.dt.settings()[0].features.stateSave ? true : false
        };
    }
    /**
     * This method allows for changes to the panes and table to be made when a
     * selection or a deselection occurs
     */
    _makeSelection() {
        this.updateTable();
        this.s.updating = true;
        this.s.dt.draw();
        this.s.updating = false;
    }
    /**
     * Populates an array with all of the data for the table
     *
     * @param rowIdx The current row index to be compared
     * @param arrayFilter The array that is to be populated with row Details
     * @param settings The DataTable settings object
     * @param bins The bins object that is to be populated with the row counts
     */
    _populatePaneArray(rowIdx, arrayFilter, settings, bins = this.s.rowData.bins) {
        var _a, _b, _c, _d;
        // Retrieve the rendered data from the cell using the fastData function
        // rather than the cell().render API method for optimisation
        let fastData = settings.fastData;
        if (typeof this.s.colOpts.orthogonal === 'string') {
            let rendered = fastData(rowIdx, this.s.index, this.s.colOpts.orthogonal);
            this.s.rowData.filterMap.set(rowIdx, rendered);
            this._addOption(rendered, rendered, rendered, rendered, arrayFilter, bins);
            this.s.rowData.totalOptions++;
        }
        else {
            let filter = fastData(rowIdx, this.s.index, ((_a = this.s.colOpts.orthogonal) === null || _a === void 0 ? void 0 : _a.search) || '');
            // Null and empty string are to be considered the same value
            if (filter === null) {
                filter = '';
            }
            if (typeof filter === 'string') {
                filter = util.stripHtml(filter);
            }
            this.s.rowData.filterMap.set(rowIdx, filter);
            if (!bins[filter]) {
                this._addOption(filter, fastData(rowIdx, this.s.index, ((_b = this.s.colOpts.orthogonal) === null || _b === void 0 ? void 0 : _b.display) || ''), fastData(rowIdx, this.s.index, ((_c = this.s.colOpts.orthogonal) === null || _c === void 0 ? void 0 : _c.sort) || ''), fastData(rowIdx, this.s.index, ((_d = this.s.colOpts.orthogonal) === null || _d === void 0 ? void 0 : _d.type) || ''), arrayFilter, bins);
                this.s.rowData.totalOptions++;
            }
            else {
                bins[filter]++;
                this.s.rowData.totalOptions++;
            }
        }
    }
    /**
     * Reloads all of the previous selects into the panes
     *
     * @param loadedFilter The loaded filters from a previous state
     */
    _reloadSelect(loadedFilter) {
        // If the state was not saved don't selected any
        if (loadedFilter === undefined || !this.s.dtPane) {
            return;
        }
        let idx = null;
        // For each pane, check that the loadedFilter list exists and is not
        // null, find the id of each search item and set it to be selected.
        for (let i = 0; i < loadedFilter.searchPanes.panes.length; i++) {
            if (loadedFilter.searchPanes.panes[i].id === this.s.index) {
                idx = i;
                break;
            }
        }
        if (idx !== null) {
            let table = this.s.dtPane;
            let rows = table
                .rows({ order: 'index' })
                .data()
                .map(item => item.filter !== null ? item.filter.toString() : null)
                .toArray();
            for (let filter of loadedFilter.searchPanes.panes[idx].selected) {
                let id = -1;
                if (filter !== null) {
                    id = rows.indexOf(filter.toString());
                }
                if (id > -1) {
                    this.s.serverSelecting = true;
                    table.row(id).select();
                    this.s.serverSelecting = false;
                }
            }
        }
    }
    /**
     * Notes the rows that have been selected within this pane and stores them
     * internally
     *
     * @param notUpdating Whether the panes are updating themselves or not
     */
    _updateSelection(notUpdating) {
        let run = () => {
            if (!this.s.dtPane) {
                return;
            }
            this.s.scrollTop = Dom.s(this.s.dtPane.table().node()).parent()[0].scrollTop;
            if (this.s.dt.page.info().serverSide && !this.s.updating) {
                if (!this.s.serverSelecting) {
                    this.s.serverSelect = this.s.dtPane
                        .rows({ selected: true })
                        .data()
                        .toArray();
                    this.s.dt.draw(false);
                }
            }
            else if (notUpdating) {
                this._makeSelection();
            }
            this.s.dt.processing(false);
        };
        this.s.dt.processing(true);
        setTimeout(run, 1);
    }
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
    _addOption(filter, display, sort, type, arrayFilter, bins) {
        // If the filter is an array then take a note of this, and add the
        // elements to the arrayFilter array
        if (Array.isArray(filter) || filter instanceof DataTable.Api) {
            // Convert to an array so that we can work with it
            if (filter instanceof DataTable.Api) {
                filter = filter.toArray();
                display = display.toArray();
            }
            if (filter.length === display.length) {
                for (let i = 0; i < filter.length; i++) {
                    // If we haven't seen this row before add it
                    if (!bins[filter[i]]) {
                        bins[filter[i]] = 1;
                        arrayFilter.push({
                            display: display[i],
                            filter: filter[i],
                            sort: sort[i],
                            type: type[i]
                        });
                    }
                    // Otherwise just increment the count
                    else {
                        bins[filter[i]]++;
                    }
                    this.s.rowData.totalOptions++;
                }
                return;
            }
            throw new Error('display and filter not the same length');
        }
        // If the values were affected by orthogonal data and are not an array
        // then check if it is already present
        else if (typeof this.s.colOpts.orthogonal === 'string') {
            if (!bins[filter]) {
                bins[filter] = 1;
                arrayFilter.push({
                    display,
                    filter,
                    sort,
                    type
                });
                this.s.rowData.totalOptions++;
            }
            else {
                bins[filter]++;
                this.s.rowData.totalOptions++;
            }
        }
        // Otherwise we must just be adding an option
        else {
            bins[filter] = 1;
            arrayFilter.push({
                display,
                filter,
                sort,
                type
            });
        }
    }
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
    _buildPane(selectedRows = [], dataIn = null, prevEl = null) {
        // Aliases
        this.s.selections = [];
        // Other Variables
        let loadedFilter = this.s.dt.state.loaded();
        let row;
        // If the listeners have not been set yet then using the latest state
        // may result in funny errors
        if (this.s.listSet) {
            loadedFilter = this.s.dt.state();
        }
        // If it is not a custom pane in place
        if (this.s.colExists) {
            let idx = -1;
            if (loadedFilter &&
                loadedFilter.searchPanes &&
                loadedFilter.searchPanes.panes) {
                for (let i = 0; i < loadedFilter.searchPanes.panes.length; i++) {
                    if (loadedFilter.searchPanes.panes[i].id === this.s.index) {
                        idx = i;
                        break;
                    }
                }
            }
            // Perform checks that do not require populate pane to run
            if ((this.s.colOpts.show === false ||
                (this.s.colOpts.show !== undefined &&
                    this.s.colOpts.show !== true)) &&
                idx === -1) {
                this.dom.container.classAdd(this.classes.hidden);
                this.s.displayed = false;
                return false;
            }
            else if (this.s.colOpts.show === true || idx !== -1) {
                this.s.displayed = true;
            }
            if (!this.s.dt.page.info().serverSide &&
                (!dataIn || !dataIn.searchPanes || !dataIn.searchPanes.options)) {
                // Only run populatePane if the data has not been collected yet
                if (this.s.rowData.arrayFilter.length === 0) {
                    this.s.rowData.totalOptions = 0;
                    this._populatePane();
                    this.s.rowData.arrayOriginal = this.s.rowData.arrayFilter;
                    this.s.rowData.binsOriginal = this.s.rowData.bins;
                }
                let binLength = Object.keys(this.s.rowData.binsOriginal).length;
                let uniqueRatio = this._uniqueRatio(binLength, this.s.dt.rows()[0].length);
                // Don't show the pane if there isn't enough variance in the
                //  data, or there is only 1 entry for that pane
                let colOptsThreshold = this.s.colOpts.threshold;
                if (this.s.displayed === false &&
                    ((this.s.colOpts.show === undefined &&
                        colOptsThreshold === null
                        ? uniqueRatio > this.c.threshold
                        : colOptsThreshold && uniqueRatio > colOptsThreshold) ||
                        (this.s.colOpts.show !== true && binLength <= 1))) {
                    this.dom.container.classAdd(this.classes.hidden);
                    this.s.displayed = false;
                    return false;
                }
                this.dom.container.classAdd(this.classes.show);
                this.s.displayed = true;
            }
            else if (dataIn &&
                dataIn.searchPanes &&
                dataIn.searchPanes.options) {
                this._serverPopulate(dataIn);
            }
        }
        else {
            this.s.displayed = true;
        }
        // If the variance is acceptable then display the search pane
        this._displayPane();
        if (!this.s.listSet) {
            // Here, when the state is loaded if the data object on the original
            // table is empty, then a state.clear() must have occurred, so
            // delete all of the panes tables state objects too.
            this.dom.dtP.on('stateLoadParams.dtsp', (e, settings, data) => {
                if (Object.keys(this.s.dt.state.loaded() || {}).length === 0) {
                    Object.keys(data).forEach(key => {
                        delete data[key];
                    });
                }
            });
        }
        // Add the container to the document in its original location
        if (prevEl !== null && this.dom.panesContainer[0].contains(prevEl)) {
            this.dom.container.insertAfter(prevEl);
        }
        else {
            this.dom.panesContainer.prepend(this.dom.container);
        }
        // Declare the DataTable for the pane
        let errMode = DataTable.ext.errMode;
        DataTable.ext.errMode = 'none';
        // For async loading of a DataTable (e.g. language file) we need to set
        // the select style to make sure the event handlers are added.
        this.dom.dtP.on('init.dt', (e, s) => {
            var dt = new DataTable.Api(this.dom.dtP);
            var style = dt.select.style();
            dt.select.style(style);
        });
        let layout;
        // We need to modify the layout default to null all entries, keeping in
        // mind that the default might have been modified by the dev using DT,
        // so it needs to be dynamic.
        let cloned = util.object.assignDeep({}, DataTable.defaults.layout);
        Object.keys(cloned).forEach(key => {
            cloned[key] = null;
        });
        layout = { layout: cloned };
        this.s.dtPane = new DataTable(this.dom.dtP[0], util.object.assignDeep(this._getPaneConfig(), this.c.dtOpts, this.s.colOpts ? this.s.colOpts.dtOpts : {}, this.s.colOpts.options || !this.s.colExists
            ? {
                createdRow(row, data) {
                    Dom.s(row).classAdd(data.className);
                }
            }
            : undefined, this.s.customPaneSettings !== null &&
            this.s.customPaneSettings.dtOpts
            ? this.s.customPaneSettings.dtOpts
            : {}, layout));
        this.dom.dtP.classAdd(this.classes.table);
        // Getting column titles is a little messy
        let headerText = 'Custom Pane';
        if (this.s.customPaneSettings && this.s.customPaneSettings.header) {
            headerText = this.s.customPaneSettings.header;
        }
        else if (this.s.colOpts.header) {
            headerText = this.s.colOpts.header;
        }
        else if (this.s.colExists) {
            headerText = this.s.dt.column(this.s.index).title();
        }
        headerText = this._escapeHTML(headerText);
        let titleText = this.s.dt
            .i18n('searchBuilder.searchTitle', this.c.i18n.searchTitle)
            .replace('{name}', headerText);
        this.dom.searchBox
            .attr('placeholder', headerText)
            .attr('title', titleText);
        DataTable.ext.errMode = errMode;
        // If it is not a custom pane
        if (this.s.colExists) {
            // Add all of the search options to the pane
            for (let j = 0, jen = this.s.rowData.arrayFilter.length; j < jen; j++) {
                if (this.s.dt.page.info().serverSide) {
                    row = this.addRow(this.s.rowData.arrayFilter[j].display, this.s.rowData.arrayFilter[j].filter, this.s.rowData.arrayFilter[j].sort, this.s.rowData.arrayFilter[j].type);
                    for (let option of this.s.serverSelect) {
                        if (option.filter ===
                            this.s.rowData.arrayFilter[j].filter) {
                            this.s.serverSelecting = true;
                            row.select();
                            this.s.serverSelecting = false;
                        }
                    }
                }
                else if (!this.s.dt.page.info().serverSide &&
                    this.s.rowData.arrayFilter[j]) {
                    this.addRow(this.s.rowData.arrayFilter[j].display, this.s.rowData.arrayFilter[j].filter, this.s.rowData.arrayFilter[j].sort, this.s.rowData.arrayFilter[j].type);
                }
                else if (!this.s.dt.page.info().serverSide) {
                    // Just pass an empty string as the message will be
                    // calculated based on that in addRow()
                    this.addRow('', '', '', '');
                }
            }
        }
        // If there are custom options set or it is a custom pane then get them
        if (this.s.colOpts.options ||
            (this.s.customPaneSettings && this.s.customPaneSettings.options)) {
            this._getComparisonRows();
        }
        // Display the pane
        this.s.dtPane.draw();
        this.s.dtPane.table().node().parentElement.scrollTop =
            this.s.scrollTop;
        this.adjustTopRow();
        this.setListeners();
        this.s.listSet = true;
        for (let selection of selectedRows) {
            if (selection) {
                for (row of this.s.dtPane.rows().indexes().toArray()) {
                    if (this.s.dtPane.row(row).data() &&
                        selection.filter ===
                            this.s.dtPane.row(row).data().filter) {
                        // If this is happening when serverSide processing is
                        //  happening then different behaviour is needed
                        if (this.s.dt.page.info().serverSide) {
                            this.s.serverSelecting = true;
                            this.s.dtPane.row(row).select();
                            this.s.serverSelecting = false;
                        }
                        else {
                            this.s.dtPane.row(row).select();
                        }
                    }
                }
            }
        }
        //  If SSP and the table is ready, apply the search for the pane
        if (this.s.dt.page.info().serverSide) {
            this.s.dtPane.search(this.dom.searchBox.val()).draw();
        }
        if (((this.c.initCollapsed && this.s.colOpts.initCollapsed !== false) ||
            this.s.colOpts.initCollapsed) &&
            ((this.c.collapse && this.s.colOpts.collapse !== false) ||
                this.s.colOpts.collapse)) {
            // If the pane has not initialised yet then we need to wait for it
            // to do so before collapsing Otherwise the container that the class
            // is added to does not exist
            this.s.dtPane.ready(() => {
                this.collapse();
            });
        }
        // Reload the selection, searchbox entry and ordering from the previous
        // state Need to check here if SSP that this is the first draw,
        // otherwise it will infinite loop
        if (loadedFilter &&
            loadedFilter.searchPanes &&
            loadedFilter.searchPanes.panes &&
            (!dataIn || dataIn.draw === 1)) {
            this._reloadSelect(loadedFilter);
            for (let pane of loadedFilter.searchPanes.panes) {
                if (pane.id === this.s.index) {
                    // Save some time by only triggering an input if there is a
                    // value
                    if (pane.searchTerm && pane.searchTerm.length > 0) {
                        this.dom.searchBox
                            .val(pane.searchTerm)
                            .trigger('input');
                    }
                    if (pane.order) {
                        this.s.dtPane.order(pane.order).draw();
                    }
                    // Is the pane to be hidden or shown?
                    if (pane.collapsed) {
                        this.collapse();
                    }
                    else {
                        this.show();
                    }
                }
            }
        }
        return true;
    }
    /**
     * Appends all of the HTML elements to their relevant parent Elements
     */
    _displayPane() {
        // Empty everything to start again
        this.dom.dtP.empty();
        this.dom.topRow.empty().classAdd(this.classes.topRow);
        // If there are more than 3 columns defined then make there be a smaller
        // gap between the panes
        if (parseInt(this.c.layout.split('-')[1], 10) > 3) {
            this.dom.container.classAdd(this.classes.smallGap);
        }
        this.dom.topRow
            .classAdd(this.classes.subRowsContainer)
            .append(this.dom.upper.append(this.dom.searchCont))
            .append(this.dom.lower.append(this.dom.buttonGroup));
        // If no selections have been made in the pane then disable the clear
        // button
        if (this.c.dtOpts.searching === false ||
            (this.s.colOpts.dtOpts &&
                this.s.colOpts.dtOpts.searching === false) ||
            !this.c.controls ||
            !this.s.colOpts.controls ||
            (this.s.customPaneSettings &&
                this.s.customPaneSettings.dtOpts &&
                this.s.customPaneSettings.dtOpts.searching !== undefined &&
                !this.s.customPaneSettings.dtOpts.searching)) {
            this.dom.searchBox
                .classRemove(this.classes.paneInputButton)
                .classAdd(this.classes.disabledButton)
                .attr('disabled', 'true');
        }
        this.dom.searchBox.appendTo(this.dom.searchCont);
        // Create the contents of the searchCont div. Worth noting that this
        // function will change when using semantic ui
        this._searchContSetup();
        // If the clear button is allowed to show then display it
        if (this.c.clear && this.c.controls && this.s.colOpts.controls) {
            this.dom.clear.appendTo(this.dom.buttonGroup);
        }
        if (this.c.orderable &&
            this.s.colOpts.orderable &&
            this.c.controls &&
            this.s.colOpts.controls) {
            this.dom.nameButton.appendTo(this.dom.buttonGroup);
        }
        // If the count column is hidden then don't display the ordering button
        // for it
        if (this.c.viewCount &&
            this.s.colOpts.viewCount &&
            this.c.orderable &&
            this.s.colOpts.orderable &&
            this.c.controls &&
            this.s.colOpts.controls) {
            this.dom.countButton.appendTo(this.dom.buttonGroup);
        }
        if (((this.c.collapse && this.s.colOpts.collapse !== false) ||
            this.s.colOpts.collapse) &&
            this.c.controls &&
            this.s.colOpts.controls) {
            this.dom.collapseButton.appendTo(this.dom.buttonGroup);
        }
        this.dom.container.prepend(this.dom.topRow).append(this.dom.dtP).show();
    }
    /**
     * Escape html characters within a string
     *
     * @param txt the string to be escaped
     * @returns the escaped string
     */
    _escapeHTML(txt) {
        return txt
            .toString()
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&');
    }
    /**
     * Gets the options for the row for the customPanes
     *
     * @returns The options for the row extended to include the options
     *   from the user.
     */
    _getBonusOptions() {
        // We need to reset the thresholds as if they have a value in colOpts
        // then that value will be used
        let defaultMutator = {
            threshold: null
        };
        return util.object.assignDeep({}, SearchPane.defaults, defaultMutator, this.c ? this.c : {});
    }
    /**
     * Gets the options for the row for the customPanes
     *
     * @returns The options for the row extended to include the options
     *   from the user.
     */
    _getOptions() {
        let table = this.s.dt;
        // We need to reset the thresholds as if they have a value in colOpts
        // then that value will be used
        let defaultMutator = {
            collapse: null,
            emptyMessage: false,
            initCollapsed: null,
            threshold: null
        };
        let columnOptions = table.settings()[0].columns[this.s.index].searchPanes;
        let colOpts = util.object.assignDeep({}, SearchPane.defaults, defaultMutator, columnOptions);
        // Legacy support
        if (columnOptions &&
            columnOptions.hideCount &&
            columnOptions.viewCount === undefined) {
            colOpts.viewCount = !columnOptions.hideCount;
        }
        return colOpts;
    }
    /**
     * Fill the array with the values that are currently being displayed in the
     * table
     */
    _populatePane() {
        this.s.rowData.arrayFilter = [];
        this.s.rowData.bins = {};
        let settings = this.s.dt.context[0];
        if (!this.s.dt.page.info().serverSide) {
            for (let index of this.s.dt.rows().indexes().toArray()) {
                this._populatePaneArray(index, this.s.rowData.arrayFilter, settings);
            }
        }
    }
    /**
     * This method decides whether a row should contribute to the pane or not
     *
     * @param filter the value that the row is to be filtered on
     * @param dataIndex the row index
     */
    _search(filter, dataIndex) {
        let colOpts = this.s.colOpts;
        let table = this.s.dt;
        // For each item selected in the pane, check if it is available in the
        // cell
        for (let colSelect of this.s.selections) {
            if (typeof colSelect === 'string' && typeof filter === 'string') {
                // The filter value will not have the &amp; in place but a &,
                // so we need to do a replace to make sure that they will match
                colSelect = this._escapeHTML(colSelect);
            }
            // if the filter is an array then is the column present in it
            if (Array.isArray(filter)) {
                if (colOpts.combiner === 'and') {
                    if (!filter.includes(colSelect)) {
                        return false;
                    }
                }
                else if (filter.includes(colSelect)) {
                    return true;
                }
            }
            // if the filter is a function then does it meet the criteria of
            // that function or not
            else if (typeof colSelect === 'function') {
                if (colSelect.call(table, table.row(dataIndex).data(), dataIndex)) {
                    if (colOpts.combiner === 'or') {
                        return true;
                    }
                }
                // If the combiner is an "and" then we need to check against all
                // possible selections so if it fails here then the and is not
                // met and return false
                else if (colOpts.combiner === 'and') {
                    return false;
                }
            }
            // otherwise if the two filter values are equal then return true
            else if (filter === colSelect ||
                // Loose type checking in case number type in column comparing to
                // a string eslint-disable-next-line eqeqeq
                (!(typeof filter === 'string' && filter.length === 0) &&
                    filter == colSelect) ||
                (colSelect === null &&
                    typeof filter === 'string' &&
                    filter === '')) {
                return true;
            }
        }
        // If the combiner is an and then we need to check against all possible
        // selections so return true here if so because it would have returned
        // false earlier if it had failed
        if (colOpts.combiner === 'and') {
            return true;
        }
        // Otherwise it hasn't matched with anything by this point so it must be
        // false
        return false;
    }
    /**
     * Creates the contents of the searchCont div
     *
     * NOTE This is overridden when semantic ui styling in order to integrate
     * the search button into the text box.
     */
    _searchContSetup() {
        if (this.c.controls && this.s.colOpts.controls) {
            this.dom.searchButton.appendTo(this.dom.searchLabelCont);
        }
        if (!(this.c.dtOpts.searching === false ||
            (this.s.colOpts.dtOpts &&
                this.s.colOpts.dtOpts.searching === false) ||
            (this.s.customPaneSettings &&
                this.s.customPaneSettings.dtOpts &&
                this.s.customPaneSettings.dtOpts.searching !== undefined &&
                !this.s.customPaneSettings.dtOpts.searching))) {
            this.dom.searchLabelCont.appendTo(this.dom.searchCont);
        }
    }
    /**
     * Adds outline to the pane when a selection has been made
     */
    _searchExtras() {
        if (!this.s.dtPane) {
            return;
        }
        let updating = this.s.updating;
        this.s.updating = true;
        let filters = this.s.dtPane
            .rows({ selected: true })
            .data()
            .pluck('filter')
            .toArray();
        let nullIndex = filters.indexOf(this.emptyMessage());
        let container = Dom.s(this.s.dtPane.table().container());
        // If null index is found then search for empty cells as a filter.
        if (nullIndex > -1) {
            filters[nullIndex] = '';
        }
        // If a filter has been applied then outline the respective pane, remove it when it no longer is.
        if (filters.length > 0) {
            container.classAdd(this.classes.selected);
        }
        else if (filters.length === 0) {
            container.classRemove(this.classes.selected);
        }
        this.s.updating = updating;
    }
}
SearchPane.version = '3.0.0';
SearchPane.classes = {
    bordered: 'dtsp-bordered',
    buttonGroup: 'dtsp-buttonGroup',
    buttonSub: 'dtsp-buttonSub',
    caret: 'dtsp-caret',
    clear: 'dtsp-clear',
    clearAll: 'dtsp-clearAll',
    clearButton: 'clearButton',
    collapseAll: 'dtsp-collapseAll',
    collapseButton: 'dtsp-collapseButton',
    container: 'dtsp-searchPane',
    countButton: 'dtsp-countButton',
    disabledButton: 'dtsp-disabledButton',
    hidden: 'dtsp-hidden',
    hide: 'dtsp-hide',
    layout: 'dtsp-',
    name: 'dtsp-name',
    nameButton: 'dtsp-nameButton',
    nameCont: 'dtsp-nameCont',
    narrow: 'dtsp-narrow',
    paneButton: 'dtsp-paneButton',
    paneInputButton: 'dtsp-paneInputButton',
    pill: 'dtsp-pill',
    rotated: 'dtsp-rotated',
    search: 'dtsp-search',
    searchCont: 'dtsp-searchCont',
    searchIcon: 'dtsp-searchIcon',
    searchLabelCont: 'dtsp-searchButtonCont',
    selected: 'dtsp-selected',
    smallGap: 'dtsp-smallGap',
    subRow1: 'dtsp-subRow1',
    subRow2: 'dtsp-subRow2',
    subRowsContainer: 'dtsp-subRowsContainer',
    title: 'dtsp-title',
    topRow: 'dtsp-topRow'
};
// Define SearchPanes default options
SearchPane.defaults = {
    clear: true,
    collapse: true,
    combiner: 'or',
    container(dt) {
        return dt.table().container();
    },
    controls: true,
    dtOpts: {},
    emptyMessage: '',
    hideCount: false,
    i18n: {
        aria: {
            clearPane: 'Clear selection',
            clearSearch: 'Clear search',
            collapse: 'Collapse / show pane',
            orderByCount: 'Order by count',
            orderByLabel: 'Order by label'
        },
        clearPane: '&times;',
        count: '{total}',
        countFiltered: '',
        emptyMessage: '<em>Empty</em>',
        searchTitle: 'Search: {name}'
    },
    initCollapsed: false,
    layout: 'auto',
    name: '',
    orderable: true,
    orthogonal: {
        display: 'display',
        filter: 'filter',
        hideCount: false,
        search: 'filter',
        show: false,
        sort: 'sort',
        threshold: 0.6,
        type: 'type',
        viewCount: true
    },
    preSelect: [],
    threshold: 0.6,
    viewCount: true
};

class SearchPaneST extends SearchPane {
    constructor(hostCtx, opts, index, panesContainer, panes) {
        super(hostCtx, opts, index, panesContainer, panes);
    }
    /**
     * When server-side processing is enabled, SP will remove rows and then
     * readd them, resulting in Select's reference to the last selected cell
     * being lost. This function is provided to update that reference.
     *
     * @returns Function
     */
    _emptyPane() {
        let dt = this.s.dtPane;
        if (dt) {
            let last = dt.select.last();
            let selectedIndex;
            if (last && dt.row(last.row).any()) {
                selectedIndex = dt.row(last.row).data().index;
            }
            dt.rows().remove();
            return function () {
                if (selectedIndex !== undefined) {
                    let idx = dt
                        .row((i, data) => data.index === selectedIndex)
                        .index();
                    dt.select.last({ row: idx, column: 0 });
                }
            };
        }
        return () => { };
    }
    /**
     * Populates the SearchPane based off of the data that has been received
     * from the server
     *
     * This method overrides SearchPane's _serverPopulate() method
     *
     * @param dataIn The data that has been sent from the server
     */
    _serverPopulate(dataIn) {
        let selection, row, data;
        this.s.rowData.binsShown = {};
        this.s.rowData.arrayFilter = [];
        if (dataIn.tableLength !== undefined) {
            this.s.tableLength = dataIn.tableLength;
            this.s.rowData.totalOptions = this.s.tableLength;
        }
        else if (this.s.tableLength === null ||
            this.s.dt.rows()[0].length > this.s.tableLength) {
            this.s.tableLength = this.s.dt.rows()[0].length;
            this.s.rowData.totalOptions = this.s.tableLength;
        }
        let colTitle = this.s.dt.column(this.s.index).dataSrc().toString();
        // If there is SP data for this column add it to the data array and bin
        if (dataIn.searchPanes.options[colTitle] !== undefined) {
            for (let dataPoint of dataIn.searchPanes.options[colTitle]) {
                this.s.rowData.arrayFilter.push({
                    display: dataPoint.label,
                    filter: dataPoint.value,
                    shown: +dataPoint.count,
                    sort: dataPoint.label,
                    total: +dataPoint.total,
                    type: dataPoint.label
                });
                this.s.rowData.binsShown[dataPoint.value] = +dataPoint.count;
                this.s.rowData.bins[dataPoint.value] = +dataPoint.total;
            }
        }
        let binLength = Object.keys(this.s.rowData.bins).length;
        let uniqueRatio = this._uniqueRatio(binLength, this.s.tableLength);
        // Don't show the pane if there isn't enough variance in the data, or
        // there is only 1 entry for that pane
        if (!this.s.colOpts.show &&
            this.s.displayed === false &&
            ((this.s.colOpts.show === undefined &&
                this.s.colOpts.threshold === null
                ? uniqueRatio > this.c.threshold
                : this.s.colOpts.threshold &&
                    uniqueRatio > this.s.colOpts.threshold) ||
                binLength <= 1)) {
            this.dom.container.classAdd(this.classes.hidden);
            this.s.displayed = false;
            return;
        }
        // Store the original data
        this.s.rowData.arrayOriginal = this.s.rowData.arrayFilter;
        this.s.rowData.binsOriginal = this.s.rowData.bins;
        // Flag this pane as being displayed
        this.s.displayed = true;
        // If the pane exists
        if (this.s.dtPane) {
            // Not the selections that have been made and remove all of the rows
            let selected = this.s.serverSelect;
            let reselect = this._emptyPane();
            // Add the rows that are to be shown into the pane
            for (data of this.s.rowData.arrayFilter) {
                if (this._shouldAddRow(data)) {
                    row = this.addRow(data.display, data.filter, data.sort, data.type);
                    // Select the row if it was selected before
                    for (let i = 0; i < selected.length; i++) {
                        selection = selected[i];
                        if (selection.filter === data.filter) {
                            // This flag stops another request being made to the
                            // server
                            this.s.serverSelecting = true;
                            row.select();
                            this.s.serverSelecting = false;
                            // Remove the selection from the to select list and
                            // add it to the selected list
                            selected.splice(i, 1);
                            this.s.selections.push(data.filter);
                            break;
                        }
                    }
                }
            }
            // Remake any selections that are no longer present
            for (selection of selected) {
                for (data of this.s.rowData.arrayOriginal) {
                    if (data.filter === selection.filter) {
                        row = this.addRow(data.display, data.filter, data.sort, data.type);
                        this.s.serverSelecting = true;
                        row.select();
                        this.s.serverSelecting = false;
                        this.s.selections.push(data.filter);
                    }
                }
            }
            // Store the selected rows
            this.s.serverSelect = this.s.dtPane
                .rows({ selected: true })
                .data()
                .toArray();
            // Update the pane
            this.s.dtPane.draw(false);
            reselect();
        }
    }
    /**
     * This method updates the rows and their data within the SearchPanes
     *
     * SearchPaneCascade overrides this method
     */
    updateRows() {
        if (!this.s.dtPane) {
            return;
        }
        if (!this.s.dt.page.info().serverSide) {
            // Get the latest count values from the table
            this.s.rowData.binsShown = {};
            for (let index of this.s.dt
                .rows({ search: 'applied' })
                .indexes()
                .toArray()) {
                this._updateShown(index, this.s.dt.settings()[0], this.s.rowData.binsShown);
            }
        }
        // Update the rows data to show the current counts
        for (let row of this.s.dtPane.rows().data().toArray()) {
            row.shown =
                typeof this.s.rowData.binsShown[row.filter] === 'number'
                    ? this.s.rowData.binsShown[row.filter]
                    : 0;
            this.s.dtPane
                .row(function (idx, data) {
                return data && data.index === row.index;
            })
                .data(row);
        }
        // Show updates in the pane
        this.s.dtPane.draw();
        this.s.dtPane.table().node().parentElement.scrollTop =
            this.s.scrollTop;
    }
    /**
     * Remove functionality from makeSelection - needs to be more advanced when
     * tracking selections
     */
    _makeSelection() {
        return;
    }
    /**
     * Blank method to remove reloading of selected rows - needs to be more
     * advanced when tracking selections
     */
    _reloadSelect() {
        return;
    }
    /**
     * Decides if a row should be added when being added from the server
     *
     * Overridden by SearchPaneCascade
     *
     * @param data the row data
     * @returns boolean indicating if the row should be added or not
     */
    _shouldAddRow(data) {
        return true;
    }
    /**
     * Updates the server selection list where appropriate
     */
    _updateSelection() {
        if (this.s.dtPane &&
            this.s.dt.page.info().serverSide &&
            !this.s.updating &&
            !this.s.serverSelecting) {
            this.s.serverSelect = this.s.dtPane
                .rows({ selected: true })
                .data()
                .toArray();
        }
    }
    /**
     * Used when binning the data for a column
     *
     * @param rowIdx The current row that is to be added to the bins
     * @param settings The DataTables settings object
     * @param bins The bins object that is to be incremented
     */
    _updateShown(rowIdx, settings, bins = this.s.rowData.binsShown) {
        var _a;
        let orth = typeof this.s.colOpts.orthogonal === 'string'
            ? this.s.colOpts.orthogonal
            : (_a = this.s.colOpts.orthogonal) === null || _a === void 0 ? void 0 : _a.search;
        let filter = settings.fastData(rowIdx, this.s.index, orth);
        let add = (f) => {
            if (!bins[f]) {
                bins[f] = 1;
            }
            else {
                bins[f]++;
            }
        };
        if (Array.isArray(filter)) {
            for (let f of filter) {
                add(f);
            }
        }
        else {
            add(filter);
        }
    }
}

class SearchPaneCascade extends SearchPaneST {
    constructor(hostCtx, opts, index, panesContainer, panes) {
        let override = {
            i18n: {
                count: '{shown}'
            }
        };
        super(hostCtx, util.object.assign(override, opts), index, panesContainer, panes);
    }
    /**
     * This method updates the rows and their data within the SearchPanes
     *
     * This overrides the method in SearchPane
     */
    updateRows() {
        if (!this.s.dtPane) {
            return;
        }
        // Note the currently selected values in the pane and remove all of the
        // rows
        let selected = this.s.dtPane.rows({ selected: true }).data().toArray();
        let selection;
        if (this.s.colOpts.options ||
            (this.s.customPaneSettings && this.s.customPaneSettings.options)) {
            // If there are custom options set or it is a custom pane then get
            // them
            this._getComparisonRows();
            let rows = this.s.dtPane.rows().toArray()[0];
            for (let i = 0; i < rows.length; i++) {
                let row = this.s.dtPane.row(rows[i]);
                let rowData = row.data();
                if (rowData === undefined) {
                    continue;
                }
                if (rowData.shown === 0) {
                    row.remove();
                    rows = this.s.dtPane.rows().toArray()[0];
                    i--;
                    continue;
                }
                for (selection of selected) {
                    if (rowData.filter === selection.filter) {
                        row.select();
                        selected.splice(i, 1);
                        this.s.selections.push(rowData.filter);
                        break;
                    }
                }
            }
        }
        else {
            if (!this.s.dt.page.info().serverSide) {
                // Get the latest count values from the table
                this._activePopulatePane();
                this.s.rowData.binsShown = {};
                for (let index of this.s.dt
                    .rows({ search: 'applied' })
                    .indexes()
                    .toArray()) {
                    this._updateShown(index, this.s.dt.settings()[0], this.s.rowData.binsShown);
                }
            }
            this.s.dtPane.rows().remove();
            // Go over all of the rows that could be displayed
            for (let data of this.s.rowData.arrayFilter) {
                // Cascade - If there are no rows present in the table don't
                // show the option
                if (data.shown === 0) {
                    continue;
                }
                // Add the row to the pane
                let newRow = this.addRow(data.display, data.filter, data.sort, data.type, undefined);
                // Check if this row was selected
                for (let j = 0; j < selected.length; j++) {
                    let selectedRow = selected[j];
                    if (selectedRow.filter === data.filter) {
                        newRow.select();
                        // Remove the row from the to find list and then add it
                        // to the selections list
                        selected.splice(j, 1);
                        this.s.selections.push(data.filter);
                        break;
                    }
                }
            }
            // Add all of the rows that were previously selected but aren't any
            // more
            for (selection of selected) {
                for (let origData of this.s.rowData.arrayOriginal) {
                    if (origData.filter === selection.filter) {
                        let addedRow = this.addRow(origData.display, origData.filter, origData.sort, origData.type, undefined);
                        addedRow.select();
                        this.s.selections.push(origData.filter);
                    }
                }
            }
        }
        // Show updates in the pane
        this.s.dtPane.draw();
        this.s.dtPane.table().node().parentElement.scrollTop =
            this.s.scrollTop;
        // If client side updated the tables results
        if (!this.s.dt.page.info().serverSide) {
            this.s.dt.draw(false);
        }
    }
    /**
     * Fill the array with the values that are currently being displayed in the
     * table
     */
    _activePopulatePane() {
        this.s.rowData.arrayFilter = [];
        this.s.rowData.bins = {};
        let settings = this.s.dt.settings()[0];
        if (!this.s.dt.page.info().serverSide) {
            for (let index of this.s.dt
                .rows({ search: 'applied' })
                .indexes()
                .toArray()) {
                this._populatePaneArray(index, this.s.rowData.arrayFilter, settings);
            }
        }
    }
    _getComparisonRows() {
        // Find the appropriate options depending on whether this is a pane for
        // a specific column or a custom pane
        let options = this.s.colOpts.options
            ? this.s.colOpts.options
            : this.s.customPaneSettings && this.s.customPaneSettings.options
                ? this.s.customPaneSettings.options
                : undefined;
        if (options === undefined || !this.s.dtPane) {
            return [];
        }
        let allRows = this.s.dt.rows();
        let shownRows = this.s.dt.rows({ search: 'applied' });
        let tableValsTotal = allRows.data().toArray();
        let tableValsShown = shownRows.data().toArray();
        let rows = [];
        // Clear all of the other rows from the pane, only custom options are to
        // be displayed when they are defined
        this.s.dtPane.clear();
        this.s.indexes = [];
        for (let comp of options) {
            // Initialise the object which is to be placed in the row
            let insert = comp.label !== '' ? comp.label : this.emptyMessage();
            let comparisonObj = {
                className: comp.className,
                display: insert,
                filter: typeof comp.value === 'function'
                    ? comp.value
                    : [],
                shown: 0,
                sort: insert,
                total: 0,
                type: insert
            };
            // If a custom function is in place
            if (typeof comp.value === 'function') {
                // Count the number of times the function evaluates to true for
                // the original data in the Table
                for (let i = 0; i < tableValsTotal.length; i++) {
                    if (comp.value.call(this.s.dt, tableValsTotal[i], allRows[0][i])) {
                        comparisonObj.total++;
                    }
                }
                for (let j = 0; j < tableValsShown.length; j++) {
                    if (comp.value.call(this.s.dt, tableValsShown[j], shownRows[0][j])) {
                        comparisonObj.shown++;
                    }
                }
                // Update the comparisonObj
                if (comp.filter && typeof comparisonObj.filter !== 'function') {
                    comparisonObj.filter.push(comp.filter);
                }
            }
            rows.push(this.addRow(comparisonObj.display, comparisonObj.filter, comparisonObj.sort, comparisonObj.type, comparisonObj.className, comparisonObj.total, comparisonObj.shown));
        }
        return rows;
    }
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
    _getMessage(row) {
        return this.s.dt
            .i18n('searchPanes.count', this.c.i18n.count)
            .replace(/{total}/g, row.total)
            .replace(/{shown}/g, row.shown);
    }
    /**
     * Overrides the blank method in SearchPane to return the number of times a
     * given value is currently being displayed
     *
     * @param filter The filter value
     * @returns number - The number of times the value is shown
     */
    _getShown(filter) {
        return this.s.rowData.binsShown && this.s.rowData.binsShown[filter]
            ? this.s.rowData.binsShown[filter]
            : 0;
    }
    /**
     * Decides if a row should be added when being added from the server
     *
     * Overrides method in by SearchPaneST
     *
     * @param data the row data
     * @returns boolean indicating if the row should be added or not
     */
    _shouldAddRow(data) {
        return data.shown > 0;
    }
}

class SearchPaneCascadeViewTotal extends SearchPaneCascade {
    constructor(ctxHost, opts, index, panesContainer, panes) {
        let override = {
            i18n: {
                count: '{total}',
                countFiltered: '{shown} ({total})'
            }
        };
        super(ctxHost, util.object.assign(override, opts), index, panesContainer, panes);
    }
    /**
     * Fill the array with the values that are currently being displayed in the table
     *
     * This method overrides _activePopulatePane() in SearchPaneCascade
     */
    _activePopulatePane() {
        this.s.rowData.arrayFilter = [];
        this.s.rowData.binsShown = {};
        let settings = this.s.dt.settings()[0];
        if (!this.s.dt.page.info().serverSide) {
            for (let index of this.s.dt
                .rows({ search: 'applied' })
                .indexes()
                .toArray()) {
                this._populatePaneArray(index, this.s.rowData.arrayFilter, settings, this.s.rowData.binsShown);
            }
        }
    }
    /**
     * Gets the message that is to be used to indicate the count for each SearchPane row
     *
     * This method overrides _getMessage() in SearchPaneCascade
     *
     * @param row The row object that is being processed
     * @returns string - the message that is to be shown for the count of each entry
     */
    _getMessage(row) {
        let countMessage = this.s.dt.i18n('searchPanes.count', this.c.i18n.count);
        let filteredMessage = this.s.dt.i18n('searchPanes.countFiltered', this.c.i18n.countFiltered);
        return (this.s.filteringActive ? filteredMessage : countMessage)
            .replace(/{total}/g, row.total)
            .replace(/{shown}/g, row.shown);
    }
}

class SearchPanes {
    constructor(hostCtx, opts, fromPreInit = false, paneClass = SearchPane) {
        // Check that the required version of DataTables is included
        if (!DataTable ||
            !DataTable.versionCheck ||
            !DataTable.versionCheck('3')) {
            throw new Error('SearchPanes requires DataTables 3 or newer');
        }
        // Check that Select is included
        // eslint-disable-next-line no-extra-parens
        if (!DataTable.select) {
            throw new Error('SearchPanes requires the Select extension for DataTables');
        }
        DataTable.plus('2026-10-22');
        let table = new DataTable.Api(hostCtx);
        this.classes = util.object.assignDeep({}, SearchPanes.classes);
        this.c = util.object.assignDeep({}, SearchPanes.defaults, opts);
        // Add extra elements to DOM object including clear
        this.dom = {
            clearAll: Dom.c('button')
                .attr('type', 'button')
                .classAdd(this.classes.clearAll)
                .html(table.i18n('searchPanes.clearMessage', this.c.i18n.clearMessage)),
            collapseAll: Dom.c('button')
                .classAdd(this.classes.collapseAll)
                .html(table.i18n('searchPanes.collapseMessage', this.c.i18n.collapseMessage)),
            container: Dom.c('div')
                .classAdd(this.classes.panes)
                .html(table.i18n('searchPanes.loadMessage', this.c.i18n.loadMessage)),
            emptyMessage: Dom.c('div').classAdd(this.classes.emptyMessage),
            panes: Dom.c('div').classAdd(this.classes.container),
            showAll: Dom.c('button')
                .attr('type', 'button')
                .classAdd(this.classes.showAll)
                .classAdd(this.classes.disabledButton)
                .attr('disabled', 'true')
                .html(table.i18n('searchPanes.showMessage', this.c.i18n.showMessage)),
            title: Dom.c('div').classAdd(this.classes.title),
            titleRow: Dom.c('div').classAdd(this.classes.titleRow)
        };
        this.s = {
            colOpts: [],
            dt: table,
            filterCount: 0,
            minPaneWidth: 260.0,
            page: 0,
            paging: false,
            pagingST: false,
            paneClass,
            panes: [],
            selectionList: [],
            serverData: {},
            stateRead: false,
            updating: false
        };
        // Do not reinitialise if already initialised on table
        if (table.settings()[0]._searchPanes) {
            return;
        }
        // When the panes update, we check it the clear buttons needs to be
        // updated
        Dom.s(document).on('draw.dt', e => {
            if (this.dom.container.find(e.target).length) {
                this._updateFilterCount();
            }
        });
        this._getState();
        if (this.s.dt.page.info().serverSide) {
            var hostSettings = this.s.dt.settings()[0];
            // Listener to get the data into the server request before it is
            // made
            this.s.dt.on('preXhr.dtsps', (e, settings, data) => {
                if (hostSettings !== settings) {
                    return;
                }
                if (data.searchPanes === undefined) {
                    data.searchPanes = {};
                }
                if (data.searchPanes_null === undefined) {
                    data.searchPanes_null = {};
                }
                let src = '';
                for (let selection of this.s.selectionList) {
                    src = this.s.dt
                        .column(selection.column)
                        .dataSrc()
                        .toString();
                    if (data.searchPanes[src] === undefined) {
                        data.searchPanes[src] = {};
                    }
                    if (data.searchPanes_null[src] === undefined) {
                        data.searchPanes_null[src] = {};
                    }
                    for (let i = 0; i < selection.rows.length; i++) {
                        data.searchPanes[src][i] = selection.rows[i];
                        if (data.searchPanes[src][i] === null) {
                            data.searchPanes_null[src][i] = true;
                        }
                        else {
                            data.searchPanes_null[src][i] = false;
                        }
                    }
                }
                if (this.s.selectionList.length > 0) {
                    data.searchPanesLast = src;
                }
                // Config options that will change how the querying is done
                data.searchPanes_options = {
                    cascade: this.c.cascadePanes,
                    viewCount: this.c.viewCount,
                    viewTotal: this.c.viewTotal
                };
            });
        }
        this._setXHR();
        table.settings()[0]._searchPanes = this;
        if (this.s.dt.settings()[0].initDone || fromPreInit) {
            this._paneDeclare(table, hostCtx, opts);
        }
        else {
            table.one('preInit.dtsps', () => {
                this._paneDeclare(table, hostCtx, opts);
            });
        }
        return this;
    }
    /**
     * Clear the selections of all of the panes
     */
    clearSelections() {
        let pane;
        for (pane of this.s.panes) {
            if (pane.s.dtPane) {
                pane.s.scrollTop = pane.s.dtPane
                    .table()
                    .node().parentElement.scrollTop;
            }
        }
        // Load in all of the searchBoxes in the documents
        let searches = this.dom.container.find('.' + this.classes.search.replace(/\s+/g, '.'));
        // For each searchBox set the input text to be empty and then trigger
        // an input on them so that they no longer filter the panes
        searches.each(el => {
            Dom.s(el).val('').trigger('input');
        });
        // Clear the selectionList
        this.s.selectionList = [];
        let returnArray = [];
        for (pane of this.s.panes) {
            if (pane.s.dtPane) {
                returnArray.push(pane.clearPane());
            }
        }
        return returnArray;
    }
    /**
     * returns the container node for the searchPanes
     */
    getNode() {
        return this.dom.container;
    }
    /**
     * rebuilds all of the panes
     */
    rebuild(targetIdx = false, maintainSelection = false) {
        this.dom.emptyMessage.detach();
        // As a rebuild from scratch is required, empty the searchpanes
        // container.
        if (targetIdx === false) {
            this.dom.panes.empty();
        }
        // Rebuild each pane individually, if a specific pane has been selected
        // then only rebuild that one
        let returnArray = [];
        for (let pane of this.s.panes) {
            if (targetIdx === false || pane.s.index === targetIdx) {
                pane.clearData();
                pane.rebuildPane(this.s.dt.page.info().serverSide ? this.s.serverData : null, maintainSelection);
                this.dom.panes.append(pane.dom.container);
                returnArray.push(pane);
            }
        }
        this._updateSelection();
        // Attach panes, clear buttons, and title bar to the document
        this._updateFilterCount();
        this._attachPaneContainer();
        this._initSelectionListeners(false);
        // If the selections are to be maintained, then it is safe to assume
        // that paging is also to be maintained Otherwise, the paging should be
        // reset
        this.s.dt.draw(!maintainSelection);
        // Resize the panes incase there has been a change
        this.resizePanes();
        // If a single pane has been rebuilt then return only that pane
        return returnArray.length === 1 ? returnArray[0] : returnArray;
    }
    /**
     * Resizes all of the panes
     */
    resizePanes() {
        let pane;
        if (this.c.layout === 'auto') {
            let contWidth = this.s.dt.searchPanes.container().width();
            let target = Math.floor(contWidth / this.s.minPaneWidth); // The neatest number of panes per row
            let highest = 1;
            let highestmod = 0;
            // Get the indexes of all of the displayed panes
            let dispIndex = [];
            for (pane of this.s.panes) {
                if (pane.s.displayed) {
                    dispIndex.push(pane.s.index);
                }
            }
            let displayCount = dispIndex.length;
            // If the neatest number is the number we have then use this.
            if (target === displayCount) {
                highest = target;
            }
            else {
                // Go from the target down and find the value with the most
                // panes left over, this will be the best fit
                for (let ppr = target; ppr > 1; ppr--) {
                    let rem = displayCount % ppr;
                    if (rem === 0) {
                        highest = ppr;
                        highestmod = 0;
                        break;
                    }
                    // If there are more left over at this amount of panes per
                    // row (ppr) then it fits better so new values
                    else if (rem > highestmod) {
                        highest = ppr;
                        highestmod = rem;
                    }
                }
            }
            // If there is a perfect fit then none are to be wider
            let widerIndexes = highestmod !== 0
                ? dispIndex.slice(dispIndex.length - highestmod, dispIndex.length)
                : [];
            this.s.panes.forEach(pane => {
                // Resize the pane with the new layout
                if (pane.s.displayed) {
                    pane.resize('columns-' +
                        (!widerIndexes.includes(pane.s.index)
                            ? highest
                            : highestmod));
                }
            });
        }
        else {
            for (pane of this.s.panes) {
                pane.adjustTopRow();
            }
        }
        return this;
    }
    /**
     * Holder method that is userd in SearchPanesST to set listeners that have
     * an effect on other panes
     *
     * @param isPreselect boolean to indicate if the preselect array is to
     * override the current selection list.
     */
    _initSelectionListeners(isPreselect) {
        return;
    }
    /**
     * Blank method that is overridden in SearchPanesST to retrieve the totals
     * from the server data
     */
    _serverTotals() {
        return;
    }
    /**
     * Set's the xhr listener so that SP can extact appropriate data from the
     * response
     */
    _setXHR() {
        var hostSettings = this.s.dt.settings()[0];
        var run = (json) => {
            if (json && json.searchPanes && json.searchPanes.options) {
                this.s.serverData = json;
                this.s.serverData.tableLength = json.recordsTotal;
                this._serverTotals();
            }
        };
        // We are using the xhr event to rebuild the panes if required due to
        // viewTotal being enabled If viewTotal is not enabled then we simply
        // update the data from the server
        this.s.dt.on('xhr.dtsps', (e, settings, json) => {
            if (hostSettings === settings) {
                run(json);
            }
        });
        // Account for the initial JSON fetch having already completed
        run(this.s.dt.ajax.json());
    }
    /**
     * Set's the function that is to be performed when a state is loaded
     *
     * Overridden by the method in SearchPanesST
     */
    _stateLoadListener() {
        var hostSettings = this.s.dt.settings()[0];
        this.s.dt.on('stateLoadParams.dtsps', (e, settings, data) => {
            if (data.searchPanes === undefined ||
                settings !== hostSettings) {
                return;
            }
            this.clearSelections();
            // Set the selection list for the panes so that the correct
            // rows can be reselected and in the right order
            this.s.selectionList = data.searchPanes.selectionList
                ? data.searchPanes.selectionList
                : [];
            // Find the panes that match from the state and the actual
            // instance
            if (data.searchPanes.panes) {
                for (let loadedPane of data.searchPanes.panes) {
                    for (let pane of this.s.panes) {
                        if (loadedPane.id === pane.s.index &&
                            pane.s.dtPane) {
                            // Set the value of the searchbox
                            pane.dom.searchBox.val(loadedPane.searchTerm);
                            // Set the value of the order
                            pane.s.dtPane.order(loadedPane.order);
                        }
                    }
                }
            }
            this._makeSelections(this.s.selectionList);
        });
    }
    /**
     * Updates the selectionList when cascade is not in place
     *
     * Overridden in SearchPanesST
     */
    _updateSelection() {
        this.s.selectionList = [];
        for (let pane of this.s.panes) {
            if (pane.s.dtPane) {
                let rows = pane.s.dtPane
                    .rows({ selected: true })
                    .data()
                    .toArray()
                    .map(el => el.filter);
                if (rows.length) {
                    this.s.selectionList.push({
                        column: pane.s.index,
                        rows
                    });
                }
            }
        }
    }
    /**
     * Attach the panes, buttons and title to the document
     */
    _attach() {
        this.dom.titleRow
            .classRemove(this.classes.hide)
            .detach()
            .append(this.dom.title);
        // If the clear button is permitted attach it
        if (this.c.clear) {
            this.dom.clearAll
                .appendTo(this.dom.titleRow)
                .off('click.dtsps')
                .on('click.dtsps', () => this.clearSelections());
        }
        if (this.c.collapse) {
            this.dom.showAll.appendTo(this.dom.titleRow);
            this.dom.collapseAll.appendTo(this.dom.titleRow);
            this._setCollapseListener();
        }
        // Attach the container for each individual pane to the overall
        // container
        for (let pane of this.s.panes) {
            this.dom.panes.append(pane.dom.container);
        }
        // Remove everything - need to use childNodes to make sure we get text
        // nodes
        this.dom.container[0].childNodes.forEach(el => el.remove());
        // Attach everything to the document
        this.dom.container
            .classRemove(this.classes.hide)
            .append(this.dom.titleRow)
            .append(this.dom.panes);
        // WORKAROUND
        this.s.panes.forEach(pane => pane.setListeners());
    }
    /**
     * If there are no panes to display then this method is called to either
     * display a message in their place or hide them completely.
     */
    _attachMessage() {
        // Create a message to display on the screen
        let message;
        try {
            message = this.s.dt.i18n('searchPanes.emptyPanes', this.c.i18n.emptyPanes);
        }
        catch (error) {
            message = null;
        }
        // If the message is an empty string then searchPanes.emptyPanes is
        // undefined, therefore the pane container should be removed from the
        // display
        if (message === null) {
            this.dom.container.classAdd(this.classes.hide);
            this.dom.titleRow.classRemove(this.classes.hide);
            return;
        }
        // Otherwise display the message
        this.dom.container.classRemove(this.classes.hide);
        this.dom.titleRow.classAdd(this.classes.hide);
        this.dom.emptyMessage.html(message).appendTo(this.dom.container);
    }
    /**
     * Attaches the panes to the document and displays a message or hides if
     * there are none
     */
    _attachPaneContainer() {
        // If a pane is to be displayed then attach the normal pane output
        for (let pane of this.s.panes) {
            if (pane.s.displayed === true) {
                this._attach();
                return;
            }
        }
        // Otherwise attach the custom message or remove the container from the
        // display
        this._attachMessage();
    }
    /**
     * Checks which panes are collapsed and then performs relevant actions to
     * the collapse/show all buttons
     */
    _checkCollapse() {
        let disableClose = true;
        let disableShow = true;
        for (let pane of this.s.panes) {
            if (pane.s.displayed) {
                // If the pane is not collapsed
                if (!pane.dom.collapseButton.classHas(pane.classes.rotated)) {
                    // Enable the collapse all button
                    this.dom.collapseAll
                        .classRemove(this.classes.disabledButton)
                        .attrRemove('disabled');
                    disableClose = false;
                }
                else {
                    // Otherwise enable the show all button
                    this.dom.showAll
                        .classRemove(this.classes.disabledButton)
                        .attrRemove('disabled');
                    disableShow = false;
                }
            }
        }
        // If this flag is still true, no panes are open so the close button
        // should be disabled
        if (disableClose) {
            this.dom.collapseAll
                .classAdd(this.classes.disabledButton)
                .attr('disabled', 'true');
        }
        // If this flag is still true, no panes are closed so the show button
        // should be disabled
        if (disableShow) {
            this.dom.showAll
                .classAdd(this.classes.disabledButton)
                .attr('disabled', 'true');
        }
    }
    /**
     * Attaches the message to the document but does not add any panes
     */
    _checkMessage() {
        // If a pane is to be displayed then attach the normal pane output
        for (let pane of this.s.panes) {
            if (pane.s.displayed === true) {
                // Ensure that the empty message is removed if a pane is
                // displayed
                this.dom.emptyMessage.detach();
                this.dom.titleRow.classRemove(this.classes.hide);
                return;
            }
        }
        // Otherwise attach the custom message or remove the container from the
        // display
        this._attachMessage();
    }
    /**
     * Collapses all of the panes
     */
    _collapseAll() {
        for (let pane of this.s.panes) {
            pane.collapse();
        }
    }
    /**
     * Finds a pane based upon the name of that pane
     *
     * @param name string representing the name of the pane
     * @returns SearchPane The pane which has that name
     */
    _findPane(name) {
        for (let pane of this.s.panes) {
            if (name === pane.s.name) {
                return pane;
            }
        }
    }
    /**
     * Gets the selection list from the previous state and stores it in the
     * selectionList Property
     */
    _getState() {
        let loadedFilter = this.s.dt.state.loaded();
        if (loadedFilter &&
            loadedFilter.searchPanes &&
            loadedFilter.searchPanes.selectionList) {
            this.s.selectionList = loadedFilter.searchPanes.selectionList;
        }
    }
    _makeSelections(selectList) {
        for (let selection of selectList) {
            let pane = null;
            for (let p of this.s.panes) {
                if (p.s.index === selection.column) {
                    pane = p;
                    break;
                }
            }
            if (pane && pane.s.dtPane) {
                for (let j = 0; j < pane.s.dtPane.rows().data().toArray().length; j++) {
                    if (selection.rows.includes(typeof pane.s.dtPane.row(j).data().filter ===
                        'function'
                        ? pane.s.dtPane.cell(j, 0).data()
                        : pane.s.dtPane.row(j).data().filter)) {
                        // Still to figure out using typing of extensions
                        // together
                        pane.s.dtPane.row(j).select();
                    }
                }
                pane.updateTable();
            }
        }
    }
    /**
     * Declares the instances of individual searchpanes dependant on the number
     * of columns. It is necessary to run this once preInit has completed
     * otherwise no panes will be created as the column count will be 0.
     *
     * @param table the DataTable api for the parent table
     * @param paneSettings the settings passed into the constructor
     * @param opts the options passed into the constructor
     */
    _paneDeclare(table, paneSettings, opts) {
        // Create Panes
        table
            .columns(this.c.columns.length > 0 ? this.c.columns : undefined)
            .eq(0)
            .each(idx => {
            this.s.panes.push(new this.s.paneClass(paneSettings, opts, idx, this.dom.panes));
        });
        // If there is any extra custom panes defined then create panes for them
        // too
        let colCount = table.columns().eq(0).toArray().length;
        for (let i = 0; i < this.c.panes.length; i++) {
            let id = colCount + i;
            this.s.panes.push(new this.s.paneClass(paneSettings, opts, id, this.dom.panes, this.c.panes[i]));
        }
        // If a custom ordering is being used
        if (this.c.order.length > 0) {
            // Make a new Array of panes based upon the order
            this.s.panes = this.c.order
                .map(name => this._findPane(name))
                .filter(p => !!p);
        }
        if (this.s.dt.settings()[0].initDone) {
            this._startup(table);
        }
        else {
            // Otherwise add the paneStartup function to the list of functions
            // that are to be run when the table is initialised. This will
            // guarantee that the panes are initialised before the init event
            // and init Complete callback is fired
            this.s.dt.settings()[0].callbacks.init.push(() => {
                this._startup(table);
            });
        }
    }
    /**
     * Sets the listeners for the collapse and show all buttons. Also sets and
     * performs checks on current panes to see if they are collapsed
     */
    _setCollapseListener() {
        this.dom.collapseAll.off('click.dtsps').on('click.dtsps', () => {
            this._collapseAll();
            this.dom.collapseAll
                .classAdd(this.classes.disabledButton)
                .attr('disabled', 'true');
            this.dom.showAll
                .classRemove(this.classes.disabledButton)
                .attrRemove('disabled');
            this.s.dt.state.save();
        });
        this.dom.showAll.off('click.dtsps').on('click.dtsps', () => {
            this._showAll();
            this.dom.showAll
                .classAdd(this.classes.disabledButton)
                .attr('disabled', 'true');
            this.dom.collapseAll
                .classRemove(this.classes.disabledButton)
                .attrRemove('disabled');
            this.s.dt.state.save();
        });
        for (let pane of this.s.panes) {
            // We want to make the same check whenever there is a collapse /
            // expand
            pane.dom.topRow
                .off('collapse.dtsps')
                .on('collapse.dtsps', () => this._checkCollapse());
        }
        this._checkCollapse();
    }
    /**
     * Shows all of the panes
     */
    _showAll() {
        for (let pane of this.s.panes) {
            pane.show();
        }
    }
    /**
     * Initialises the tables previous/preset selections and initialises
     * callbacks for events
     *
     * @param table the parent table for which the searchPanes are being created
     */
    _startup(table) {
        // Attach clear button and title bar to the document
        this._attach();
        this.dom.panes.empty();
        var hostSettings = this.s.dt.settings()[0];
        for (let pane of this.s.panes) {
            pane.rebuildPane(Object.keys(this.s.serverData).length > 0
                ? this.s.serverData
                : undefined);
            this.dom.panes.append(pane.dom.container);
        }
        // If the layout is set to auto then the panes need to be resized to
        // their best fit
        if (this.c.layout === 'auto') {
            this.resizePanes();
        }
        let loadedFilter = this.s.dt.state.loaded();
        // Reset the paging if that has been saved in the state
        if (!this.s.stateRead && loadedFilter && loadedFilter.start) {
            this.s.dt
                .page(loadedFilter.start / this.s.dt.page.len())
                .draw('page');
        }
        this.s.stateRead = true;
        this._checkMessage();
        // When a draw is called on the DataTable, update all of the panes
        // in case the data in the DataTable has changed
        table.on('preDraw.dtsps', () => {
            // Check that the panes are not updating to avoid infinite loops
            // Also check that this draw is not due to paging
            if (!this.s.updating && !this.s.paging) {
                this._updateFilterCount();
                this._updateSelection();
            }
            // Paging flag reset - we only need to dodge the draw once
            this.s.paging = false;
        });
        Dom.w.on('resize.dtsps', util.throttle(() => this.resizePanes()));
        // Whenever a state save occurs store the selection list in the state
        // object
        this.s.dt.on('stateSaveParams.dtsps', (e, settings, data) => {
            if (settings !== hostSettings) {
                return;
            }
            if (data.searchPanes === undefined) {
                data.searchPanes = {};
            }
            data.searchPanes.selectionList = this.s.selectionList;
        });
        this._stateLoadListener();
        // Listener for paging on main table
        table
            .off('page.dtsps page-nc.dtsps')
            .on('page.dtsps page-nc.dtsps', (e, s) => {
            this.s.paging = true;
            // This is an indicator to any selection tracking classes that
            // paging has occurred. It has to happen here so that we don't
            // stack event listeners unnecessarily. The value is only ever
            // set back to false in the SearchPanesST class Equally it is
            // never read in this class
            this.s.pagingST = true;
            this.s.page = this.s.dt.page();
        });
        if (this.s.dt.page.info().serverSide) {
            table
                .off('preXhr.dtsps')
                .on('preXhr.dtsps', (e, settings, data) => {
                if (settings !== hostSettings) {
                    return;
                }
                if (!data.searchPanes) {
                    data.searchPanes = {};
                }
                if (!data.searchPanes_null) {
                    data.searchPanes_null = {};
                }
                // Count how many filters are being applied
                let filterCount = 0;
                for (let pane of this.s.panes) {
                    let src = this.s.dt
                        .column(pane.s.index)
                        .dataSrc()
                        .toString();
                    if (!data.searchPanes[src]) {
                        data.searchPanes[src] = {};
                    }
                    if (!data.searchPanes_null[src]) {
                        data.searchPanes_null[src] = {};
                    }
                    if (pane.s.dtPane) {
                        let rowData = pane.s.dtPane
                            .rows({ selected: true })
                            .data()
                            .toArray();
                        for (let i = 0; i < rowData.length; i++) {
                            data.searchPanes[src][i] =
                                rowData[i].filter;
                            if (!data.searchPanes[src][i]) {
                                data.searchPanes_null[src][i] = true;
                            }
                            else {
                                data.searchPanes_null[src][i] = false;
                            }
                            filterCount++;
                        }
                    }
                }
                // If there is a filter to be applied, then we need to read
                // from the start of the result set and set the paging to 0.
                // This matches the behaviour of client side processing
                if (filterCount > 0) {
                    // If the number of filters has changed we need to read
                    // from the start of the result set and reset the paging
                    if (filterCount !== this.s.filterCount) {
                        data.start = 0;
                        this.s.page = 0;
                        this.s.dt.page(this.s.page);
                    }
                    this.s.filterCount = filterCount;
                }
                if (this.s.selectionList.length > 0) {
                    data.searchPanesLast = this.s.dt
                        .column(this.s.selectionList[this.s.selectionList.length - 1].column)
                        .dataSrc()
                        .toString();
                }
                // Config options that will change how the querying is done
                data.searchPanes_options = {
                    cascade: this.c.cascadePanes,
                    viewCount: this.c.viewCount,
                    viewTotal: this.c.viewTotal
                };
            });
        }
        else {
            table.on('preXhr.dtsps', () => this.s.panes.forEach(pane => pane.clearData()));
        }
        // If the data is reloaded from the server then it is possible that it
        // has changed completely, so we need to rebuild the panes
        this.s.dt.on('xhr.dtsps', (e, settings) => {
            if (settings.table !== this.s.dt.table().node()) {
                return;
            }
            if (!this.s.dt.page.info().serverSide) {
                let processing = false;
                this.s.dt.one('preDraw.dtsps', () => {
                    if (processing) {
                        return;
                    }
                    let page = this.s.dt.page();
                    processing = true;
                    this.s.updating = true;
                    this.dom.panes.empty();
                    for (let pane of this.s.panes) {
                        // Clears all of the bins and will mean that the data
                        // has to be re-read
                        pane.clearData();
                        // Pass a boolean to say whether this is the last choice
                        // made for maintaining selections when rebuilding
                        pane.rebuildPane(undefined, true);
                        this.dom.panes.append(pane.dom.container);
                    }
                    if (!this.s.dt.page.info().serverSide) {
                        this.s.dt.draw();
                    }
                    this.s.updating = false;
                    this._updateSelection();
                    this._checkMessage();
                    this.s.dt.one('draw.dtsps', () => {
                        this.s.updating = true;
                        this.s.dt.page(page).draw(false);
                        this.s.updating = false;
                    });
                });
            }
        });
        // PreSelect any selections which have been defined using the preSelect
        // option
        let selectList = this.c.preSelect;
        if (loadedFilter &&
            loadedFilter.searchPanes &&
            loadedFilter.searchPanes.selectionList) {
            selectList = loadedFilter.searchPanes.selectionList;
        }
        this._makeSelections(selectList);
        // Update the title bar to show how many filters have been selected
        this._updateFilterCount();
        // If the table is destroyed and restarted then clear the selections so
        // that they do not persist.
        table.on('destroy.dtsps', (e, settings) => {
            if (settings !== hostSettings) {
                return;
            }
            for (let pane of this.s.panes) {
                pane.destroy();
            }
            table.off('.dtsps');
            this.dom.showAll.off('.dtsps');
            this.dom.clearAll.off('.dtsps');
            this.dom.collapseAll.off('.dtsps');
            Dom.s(table.table().node()).off('.dtsps');
            this.dom.container.detach();
            this.clearSelections();
        });
        if (this.c.collapse) {
            this._setCollapseListener();
        }
        // When the clear All button has been pressed clear all of the
        // selections in the panes
        if (this.c.clear) {
            this.dom.clearAll
                .off('click.dtsps')
                .on('click.dtsps', () => this.clearSelections());
        }
        hostSettings._searchPanes = this;
        // This state save is required so that state is maintained over multiple
        // refreshes if no actions are made
        this.s.dt.state.save();
    }
    /**
     * Updates the number of filters that have been applied in the title
     */
    _updateFilterCount() {
        let filterCount = 0;
        let tableSearch = 0;
        // Add the number of all of the filters throughout the panes
        for (let pane of this.s.panes) {
            if (pane.s.dtPane) {
                filterCount += pane.getPaneCount();
                if (pane.s.dtPane.search()) {
                    tableSearch++;
                }
            }
        }
        // Run the message through the internationalisation method to improve
        // readability
        this.dom.title.html(this.s.dt.i18n('searchPanes.title', this.c.i18n.title, filterCount));
        if (this.c.filterChanged &&
            typeof this.c.filterChanged === 'function') {
            this.c.filterChanged.call(this.s.dt, filterCount);
        }
        if (filterCount === 0 && tableSearch === 0) {
            this.dom.clearAll
                .classAdd(this.classes.disabledButton)
                .attr('disabled', 'true');
        }
        else {
            this.dom.clearAll
                .classRemove(this.classes.disabledButton)
                .attrRemove('disabled');
        }
    }
}
SearchPanes.version = SearchPane.version;
SearchPanes.classes = {
    clear: 'dtsp-clear',
    clearAll: 'dtsp-clearAll',
    collapseAll: 'dtsp-collapseAll',
    container: 'dtsp-searchPanes',
    disabledButton: 'dtsp-disabledButton',
    emptyMessage: 'dtsp-emptyMessage',
    hide: 'dtsp-hidden',
    panes: 'dtsp-panesContainer',
    search: 'dtsp-search',
    showAll: 'dtsp-showAll',
    title: 'dtsp-title',
    titleRow: 'dtsp-titleRow'
};
// Define SearchPanes default options
SearchPanes.defaults = {
    cascadePanes: false,
    clear: true,
    collapse: true,
    columns: [],
    container(dt) {
        return dt.table().container();
    },
    filterChanged: undefined,
    i18n: {
        clearMessage: 'Clear All',
        clearPane: '&times;',
        collapse: {
            0: 'SearchPanes',
            _: 'SearchPanes (%d)'
        },
        collapseMessage: 'Collapse All',
        count: '{total}',
        countFiltered: '',
        emptyMessage: '<em>Empty</em>',
        emptyPanes: 'No SearchPanes',
        loadMessage: 'Loading Search Panes...',
        showMessage: 'Show All',
        title: 'Filters Active - %d'
    },
    layout: 'auto',
    order: [],
    panes: [],
    preSelect: [],
    viewCount: true,
    viewTotal: false
};

class SearchPaneViewTotal extends SearchPaneST {
    constructor(ctxHost, opts, index, panesContainer, panes) {
        let override = {
            i18n: {
                countFiltered: '{shown} ({total})'
            }
        };
        super(ctxHost, util.object.assignDeep(override, opts), index, panesContainer, panes);
    }
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
    _getMessage(row) {
        let countMessage = this.s.dt.i18n('searchPanes.count', this.c.i18n.count);
        let filteredMessage = this.s.dt.i18n('searchPanes.countFiltered', this.c.i18n.countFiltered);
        return (this.s.filteringActive ? filteredMessage : countMessage)
            .replace(/{total}/g, row.total)
            .replace(/{shown}/g, row.shown);
    }
    /**
     * Overrides the blank method in SearchPane to return the number of times a
     * given value is currently being displayed
     *
     * @param filter The filter value
     * @returns number - The number of times the value is shown
     */
    _getShown(filter) {
        return this.s.rowData.binsShown && this.s.rowData.binsShown[filter]
            ? this.s.rowData.binsShown[filter]
            : 0;
    }
}

class SearchPanesST extends SearchPanes {
    constructor(hostCtx, opts, fromPreInit = false) {
        let paneClass;
        if (opts.cascadePanes && opts.viewTotal) {
            paneClass = SearchPaneCascadeViewTotal;
        }
        else if (opts.cascadePanes) {
            paneClass = SearchPaneCascade;
        }
        else if (opts.viewTotal) {
            paneClass = SearchPaneViewTotal;
        }
        super(hostCtx, opts, fromPreInit, paneClass);
        let dt = this.s.dt;
        let loadedFilter = dt.state.loaded();
        let loadFn = () => this._initSelectionListeners(true, loadedFilter &&
            loadedFilter.searchPanes &&
            loadedFilter.searchPanes.selectionList
            ? loadedFilter.searchPanes.selectionList
            : this.c.preSelect);
        if (dt.settings()[0].initDone) {
            loadFn();
        }
        else {
            dt.off('init.dtsps').on('init.dtsps', loadFn);
        }
    }
    /**
     * Ensures that the correct selection listeners are set for selection
     * tracking
     *
     * @param preSelect Any values that are to be preselected
     */
    _initSelectionListeners(isPreselect = true, preSelect = []) {
        if (isPreselect) {
            this.s.selectionList = preSelect;
        }
        // Set selection listeners for each pane
        for (let pane of this.s.panes) {
            if (pane.s.displayed && pane.s.dtPane) {
                pane.s.dtPane
                    .off('select.dtsp')
                    .on('select.dtsp', this._update(pane))
                    .off('deselect.dtsp')
                    .on('deselect.dtsp', this._updateTimeout(pane));
            }
        }
        // Update on every draw
        this.s.dt.off('draw.dtsps').on('draw.dtsps', this._update());
        // Also update right now as table has just initialised
        this._updateSelectionList();
    }
    /**
     * Retrieve the total values from the server data
     */
    _serverTotals() {
        for (let pane of this.s.panes) {
            if (pane.s.colOpts.show) {
                let colTitle = this.s.dt
                    .column(pane.s.index)
                    .dataSrc()
                    .toString();
                let blockVT = true;
                // If any of the counts are not equal to the totals filtering
                // must be active
                if (this.s.serverData.searchPanes.options[colTitle]) {
                    for (let data of this.s.serverData.searchPanes.options[colTitle]) {
                        if (data.total !== data.count) {
                            blockVT = false;
                            break;
                        }
                    }
                }
                // Set if filtering is present on the pane and populate the data
                // arrays
                pane.s.filteringActive = !blockVT;
                pane._serverPopulate(this.s.serverData);
            }
        }
    }
    /**
     * Set's the function that is to be performed when a state is loaded
     *
     * Overrides the method in SearchPanes
     */
    _stateLoadListener() {
        let stateLoadFunction = (e, settings, data) => {
            if (data.searchPanes === undefined) {
                return;
            }
            // Set the selection list for the panes so that the correct
            // rows can be reselected and in the right order
            this.s.selectionList = data.searchPanes.selectionList
                ? data.searchPanes.selectionList
                : [];
            // Find the panes that match from the state and the actual instance
            if (data.searchPanes.panes) {
                for (let loadedPane of data.searchPanes.panes) {
                    for (let pane of this.s.panes) {
                        if (loadedPane.id === pane.s.index && pane.s.dtPane) {
                            // Set the value of the searchbox
                            pane.dom.searchBox.val(loadedPane.searchTerm);
                            // Set the value of the order
                            pane.s.dtPane.order(loadedPane.order);
                        }
                    }
                }
            }
            this._updateSelectionList();
        };
        this.s.dt
            .off('stateLoadParams.dtsps', stateLoadFunction)
            .on('stateLoadParams.dtsps', stateLoadFunction);
    }
    /**
     * Remove the function's actions when using cascade
     *
     * Overrides the method in SearchPanes
     */
    _updateSelection() {
        return;
    }
    /**
     * Returns a function that updates the selection list based on a specific
     * pane Also clears the timeout to stop the deselect from running
     *
     * @param pane the pane that is to have it's selections loaded
     */
    _update(pane = undefined) {
        return () => {
            if (pane) {
                clearTimeout(pane.s.deselectTimeout);
            }
            this._updateSelectionList(pane);
        };
    }
    /**
     * Returns a function that updates the selection list based on a specific
     * pane Also sets a timeout in case a select is about to be made
     *
     * @param pane the pane that is to have it's selections loaded
     */
    _updateTimeout(pane = undefined) {
        return () => pane
            ? (pane.s.deselectTimeout = setTimeout(() => this._updateSelectionList(pane), 50))
            : this._updateSelectionList();
    }
    /**
     * Updates the selection list to include the latest selections for a given
     * pane
     *
     * @param index The index of the pane that is to be updated
     * @param selected Which rows are selected within the pane
     */
    _updateSelectionList(paneIn = undefined) {
        // Bail if any of these flags are set
        if (this.s.pagingST) {
            // Reset pagingST flag
            this.s.pagingST = false;
            return;
        }
        else if (this.s.updating || (paneIn && paneIn.s.serverSelecting)) {
            return;
        }
        if (paneIn !== undefined && paneIn.s.dtPane) {
            if (this.s.dt.page.info().serverSide) {
                paneIn._updateSelection(false);
            }
            // Get filter values for all of the rows and the selections
            let rows = paneIn.s.dtPane
                .rows({ selected: true })
                .data()
                .toArray()
                .map(el => el.filter);
            this.s.selectionList = this.s.selectionList.filter(selection => selection.column !== paneIn.s.index);
            if (rows.length > 0) {
                this.s.selectionList.push({
                    column: paneIn.s.index,
                    rows
                });
                paneIn.dom.clear
                    .classRemove(this.classes.disabledButton)
                    .attrRemove('disabled');
            }
            else {
                paneIn.dom.clear
                    .classAdd(this.classes.disabledButton)
                    .attr('disabled', 'true');
            }
            if (this.s.dt.page.info().serverSide) {
                this.s.dt.draw(false);
            }
        }
        this._remakeSelections();
        this._updateFilterCount();
    }
    /**
     * Remake the selections that were present before new data or calculations
     * have occurred
     */
    _remakeSelections() {
        let currPane;
        let pane;
        this.s.updating = true;
        if (!this.s.dt.page.info().serverSide) {
            let tmpSL = this.s.selectionList;
            let anotherFilter = false;
            this.clearSelections();
            this.s.dt.draw(false);
            // When there are no selections present if the length of the data
            // does not match the searched data then another filter is present
            if (this.s.dt.rows().toArray()[0].length >
                this.s.dt.rows({ search: 'applied' }).toArray()[0].length) {
                anotherFilter = true;
            }
            this.s.selectionList = tmpSL;
            // Update the rows in each pane
            for (pane of this.s.panes) {
                if (pane.s.displayed) {
                    pane.s.filteringActive = anotherFilter;
                    pane.updateRows();
                }
            }
            for (let selection of this.s.selectionList) {
                pane = null;
                for (let paneCheck of this.s.panes) {
                    if (paneCheck.s.index === selection.column) {
                        pane = paneCheck;
                        break;
                    }
                }
                if (!pane || !pane.s.dtPane) {
                    continue;
                }
                let ids = pane.s.dtPane.rows().indexes().toArray();
                // Select the rows that are present in the selection list
                for (let i = 0; i < selection.rows.length; i++) {
                    let rowFound = false;
                    for (let id of ids) {
                        let currRow = pane.s.dtPane.row(id);
                        let data = currRow.data();
                        if (selection.rows[i] === data.filter) {
                            currRow.select();
                            rowFound = true;
                        }
                    }
                    if (!rowFound) {
                        selection.rows.splice(i, 1);
                        i--;
                    }
                }
                pane.s.selections = selection.rows;
                // If there are no rows selected then don't bother continuing
                // past here Will just increase processing time and skew the
                // rows that are shown in the table
                if (selection.rows.length === 0) {
                    continue;
                }
                // Update the table to display the current results
                this.s.dt.draw();
                let filteringActive = false;
                let filterCount = 0;
                let prevSelectedPanes = 0;
                let selectedPanes = 0;
                // Add the number of all of the filters throughout the panes
                for (currPane of this.s.panes) {
                    if (currPane.s.dtPane) {
                        filterCount += currPane.getPaneCount();
                        if (filterCount > prevSelectedPanes) {
                            selectedPanes++;
                            prevSelectedPanes = filterCount;
                        }
                    }
                }
                filteringActive = filterCount > 0;
                for (currPane of this.s.panes) {
                    if (currPane.s.displayed) {
                        // Set the filtering active flag
                        if (anotherFilter ||
                            pane.s.index !== currPane.s.index ||
                            !filteringActive) {
                            currPane.s.filteringActive =
                                filteringActive || anotherFilter;
                        }
                        else if (selectedPanes === 1) {
                            currPane.s.filteringActive = false;
                        }
                        // Update the rows to show correct counts
                        if (currPane.s.index !== pane.s.index) {
                            currPane.updateRows();
                        }
                    }
                }
            }
            // Update table to show final search results
            this.s.dt.draw(false);
        }
        else {
            // Identify the last pane to have a change in selection
            if (this.s.selectionList.length > 0) {
                pane =
                    this.s.panes[this.s.selectionList[this.s.selectionList.length - 1]
                        .column];
            }
            // Update the rows of all of the other panes
            for (currPane of this.s.panes) {
                if (currPane.s.displayed &&
                    (!pane || currPane.s.index !== pane.s.index)) {
                    currPane.updateRows();
                }
            }
        }
        this.s.updating = false;
    }
}


DataTable.SearchPanes = SearchPanes;
DataTable.SearchPanesST = SearchPanesST;
DataTable.SearchPane = SearchPane;
DataTable.SearchPaneViewTotal = SearchPaneViewTotal;
DataTable.SearchPaneCascade = SearchPaneCascade;
DataTable.SearchPaneCascadeViewTotal = SearchPaneCascadeViewTotal;
Api.register('searchPanes()', function () {
    return this;
});
Api.register('searchPanes.clearSelections()', function () {
    return this.iterator('table', function (ctx) {
        if (ctx._searchPanes) {
            ctx._searchPanes.clearSelections();
        }
    });
});
Api.register('searchPanes.rebuildPane()', function (targetIdx, maintainSelections) {
    return this.iterator('table', function (ctx) {
        if (ctx._searchPanes) {
            ctx._searchPanes.rebuild(targetIdx, maintainSelections);
        }
    });
});
Api.register('searchPanes.resizePanes()', function () {
    let ctx = this.context[0];
    return ctx._searchPanes ? ctx._searchPanes.resizePanes() : null;
});
Api.register('searchPanes.container()', function () {
    let ctx = this.context[0];
    return ctx._searchPanes ? ctx._searchPanes.getNode() : null;
});
DataTable.ext.buttons.searchPanesClear = {
    action(e, dt) {
        dt.searchPanes.clearSelections();
    },
    text: 'Clear Panes'
};
DataTable.ext.buttons.searchPanes = {
    action(e, dt, node, config) {
        var that = this;
        if (!config._panes) {
            // No SearchPanes on this button yet - initialise and show
            this.processing(true);
            setTimeout(() => {
                _buttonSourced(dt, node, config);
                this.popover(config._panes.getNode(), {
                    align: 'container',
                    span: 'container'
                });
                config._panes.rebuild(undefined, true);
                // Tables were hidden in the popover, need to be resized
                new DataTable.Api(Dom.s(config._panes.getNode()).find('table.dataTable')).columns.adjust();
                that.processing(false);
            }, 10);
        }
        else {
            // Already got SP - show it
            this.popover(config._panes.getNode(), {
                align: 'container',
                span: 'container'
            });
            config._panes.rebuild(undefined, true);
        }
    },
    init: function (dt, node, config) {
        this.text(config.text || dt.i18n('searchPanes.collapse', 'SearchPanes', 0));
        // For cases when we need to initialise the SearchPane immediately
        if (dt.init().stateSave || config.delayInit === false) {
            _buttonSourced(dt, node, config);
        }
    },
    config: {},
    text: '',
    delayInit: true
};
function _buttonSourced(dt, node, config) {
    let buttonOpts = util.object.assign({
        filterChanged(count) {
            dt.button(node).text(dt.i18n('searchPanes.collapse', dt.context[0].language.searchPanes !== undefined
                ? dt.context[0].language.searchPanes.collapse
                : dt.context[0]._searchPanes.c.i18n.collapse, count));
        }
    }, config.config);
    let panes = buttonOpts && (buttonOpts.cascadePanes || buttonOpts.viewTotal)
        ? new DataTable.SearchPanesST(dt, buttonOpts)
        : new DataTable.SearchPanes(dt, buttonOpts);
    dt.button(node).text(config.text || dt.i18n('searchPanes.collapse', panes.c.i18n.collapse, 0));
    config._panes = panes;
}
function _init(settings, options = null, fromPre = false) {
    let api = new DataTable.Api(settings);
    let opts = options
        ? options
        : api.init().searchPanes || DataTable.defaults.searchPanes;
    let searchPanes = opts && (opts.cascadePanes || opts.viewTotal)
        ? new SearchPanesST(settings, opts, fromPre)
        : new SearchPanes(settings, opts, fromPre);
    let node = searchPanes.getNode();
    return node;
}
// Attach a listener to the document which listens for DataTables initialisation
// events so we can automatically initialise
Dom.on('preInit.dt.dtsp', function (e, settings) {
    if (e.namespace !== 'dt') {
        return;
    }
    if (settings.init.searchPanes || DataTable.defaults.searchPanes) {
        if (!settings._searchPanes) {
            _init(settings, null, true);
        }
    }
});
// DataTables `dom` feature option
DataTable.ext.feature.push({
    cFeature: 'P',
    fnInit: _init
});
// DataTables 2 layout feature
if (DataTable.feature) {
    DataTable.feature.register('searchPanes', _init);
}


export default DataTable;

