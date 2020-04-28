/*! SearchPanes 1.0.1
 * 2019-2020 SpryMedia Ltd - datatables.net/license
 */
(function () {
    'use strict';

    let $;
    let DataTable;
    function setJQuery(jq) {
        $ = jq;
        DataTable = jq.fn.dataTable;
    }
    class SearchPane {
        /**
         * Creates the panes, sets up the search function
         * @param paneSettings The settings for the searchPanes
         * @param opts The options for the default features
         * @param idx the index of the column for this pane
         * @returns {object} the pane that has been created, including the table and the index of the pane
         */
        constructor(paneSettings, opts, idx, layout, panesContainer, panes = null) {
            // Check that the required version of DataTables is included
            if (!DataTable || !DataTable.versionCheck || !DataTable.versionCheck('1.10.0')) {
                throw new Error('SearchPane requires DataTables 1.10 or newer');
            }
            // Check that Select is included
            if (!DataTable.select) {
                throw new Error('SearchPane requires Select');
            }
            let table = new DataTable.Api(paneSettings);
            this.classes = $.extend(true, {}, SearchPane.classes);
            // Get options from user
            this.c = $.extend(true, {}, SearchPane.defaults, opts);
            this.customPaneSettings = panes;
            this.s = {
                cascadeRegen: false,
                clearing: false,
                colOpts: [],
                deselect: false,
                displayed: false,
                dt: table,
                dtPane: undefined,
                filteringActive: false,
                index: idx,
                indexes: [],
                lastSelect: false,
                listSet: false,
                name: undefined,
                redraw: false,
                rowData: {
                    arrayFilter: [],
                    arrayOriginal: [],
                    arrayTotals: [],
                    bins: {},
                    binsOriginal: {},
                    binsTotal: {},
                    filterMap: new Map(),
                    totalOptions: 0
                },
                searchFunction: undefined,
                selectPresent: false,
                serverSelect: [],
                serverSelecting: false,
                tableLength: null,
                updating: false,
            };
            let rowLength = table.columns().eq(0).toArray().length;
            this.colExists = this.s.index < rowLength;
            // Add extra elements to DOM object including clear and hide buttons
            this.c.layout = layout;
            let layVal = parseInt(layout.split('-')[1], 10);
            this.dom = {
                buttonGroup: $('<div/>').addClass(this.classes.buttonGroup),
                clear: $('<button type="button">&#215;</button>')
                    .addClass(this.classes.dull)
                    .addClass(this.classes.paneButton)
                    .addClass(this.classes.clearButton),
                container: $('<div/>').addClass(this.classes.container).addClass(this.classes.layout +
                    (layVal < 10 ? layout : layout.split('-')[0] + '-9')),
                countButton: $('<button type="button"></button>')
                    .addClass(this.classes.paneButton)
                    .addClass(this.classes.countButton),
                dtP: $('<table><thead><tr><th>' +
                    (this.colExists
                        ? $(table.column(this.colExists ? this.s.index : 0).header()).text()
                        : this.customPaneSettings.header || 'Custom Pane') + '</th><th/></tr></thead></table>'),
                lower: $('<div/>').addClass(this.classes.subRow2).addClass(this.classes.narrowButton),
                nameButton: $('<button type="button"></button>').addClass(this.classes.paneButton).addClass(this.classes.nameButton),
                panesContainer,
                searchBox: $('<input/>').addClass(this.classes.paneInputButton).addClass(this.classes.search),
                searchButton: $('<button type = "button" class="' + this.classes.searchIcon + '"></button>')
                    .addClass(this.classes.paneButton),
                searchCont: $('<div/>').addClass(this.classes.searchCont),
                searchLabelCont: $('<div/>').addClass(this.classes.searchLabelCont),
                topRow: $('<div/>').addClass(this.classes.topRow),
                upper: $('<div/>').addClass(this.classes.subRow1).addClass(this.classes.narrowSearch),
            };
            this.s.displayed = false;
            table = this.s.dt;
            this.selections = [];
            this.s.colOpts = this.colExists ? this._getOptions() : this._getBonusOptions();
            let colOpts = this.s.colOpts;
            let clear = $('<button type="button">X</button>').addClass(this.classes.paneButton);
            $(clear).text(table.i18n('searchPanes.clearPane', 'X'));
            this.dom.container.addClass(colOpts.className);
            this.dom.container.addClass((this.customPaneSettings !== null && this.customPaneSettings.className !== undefined)
                ? this.customPaneSettings.className
                : '');
            // Set the value of name incase ordering is desired
            if (this.s.colOpts.name !== undefined) {
                this.s.name = this.s.colOpts.name;
            }
            else if (this.customPaneSettings !== null && this.customPaneSettings.name !== undefined) {
                this.s.name = this.customPaneSettings.name;
            }
            else {
                this.s.name = this.colExists ?
                    $(table.column(this.s.index).header()).text() :
                    this.customPaneSettings.header || 'Custom Pane';
            }
            $(panesContainer).append(this.dom.container);
            let tableNode = table.table(0).node();
            // Custom search function for table
            this.s.searchFunction = (settings, searchData, dataIndex, origData) => {
                // If no data has been selected then show all
                if (this.selections.length === 0) {
                    return true;
                }
                if (settings.nTable !== tableNode) {
                    return true;
                }
                let filter = '';
                if (this.colExists) {
                    // Get the current filtered data
                    filter = searchData[this.s.index];
                    if (colOpts.orthogonal.filter !== 'filter') {
                        // get the filter value from the map
                        filter = this.s.rowData.filterMap.get(dataIndex);
                        if (filter instanceof $.fn.dataTable.Api) {
                            filter = filter.toArray();
                        }
                    }
                }
                return this._search(filter, dataIndex);
            };
            $.fn.dataTable.ext.search.push(this.s.searchFunction);
            // If the clear button for this pane is clicked clear the selections
            if (this.c.clear) {
                $(clear).on('click', () => {
                    let searches = this.dom.container.find(this.classes.search);
                    searches.each(function () {
                        $(this).val('');
                        $(this).trigger('input');
                    });
                    this.clearPane();
                });
            }
            // Sometimes the top row of the panes containing the search box and ordering buttons appears
            //  weird if the width of the panes is lower than expected, this fixes the design.
            // Equally this may occur when the table is resized.
            table.on('draw.dtsp', () => {
                this._adjustTopRow();
            });
            $(window).on('resize.dtsp', DataTable.util.throttle(() => {
                this._adjustTopRow();
            }));
            // When column-reorder is present and the columns are moved, it is necessary to
            //  reassign all of the panes indexes to the new index of the column.
            table.on('column-reorder.dtsp', (e, settings, details) => {
                this.s.index = details.mapping[this.s.index];
            });
            return this;
        }
        /**
         * In the case of a rebuild there is potential for new data to have been included or removed
         * so all of the rowData must be reset as a precaution.
         */
        clearData() {
            this.s.rowData = {
                arrayFilter: [],
                arrayOriginal: [],
                arrayTotals: [],
                bins: {},
                binsOriginal: {},
                binsTotal: {},
                filterMap: new Map(),
                totalOptions: 0,
            };
        }
        /**
         * Clear the selections in the pane
         */
        clearPane() {
            // Deselect all rows which are selected and update the table and filter count.
            this.s.dtPane.rows({ selected: true }).deselect();
            this.updateTable();
            return this;
        }
        /**
         * Strips all of the SearchPanes elements from the document and turns all of the listeners for the buttons off
         */
        destroy() {
            $(this.s.dtPane).off('.dtsp');
            $(this.s.dt).off('.dtsp');
            $(this.dom.nameButton).off('.dtsp');
            $(this.dom.countButton).off('.dtsp');
            $(this.dom.clear).off('.dtsp');
            $(this.dom.searchButton).off('.dtsp');
            $(this.dom.container).remove();
            let searchIdx = $.fn.dataTable.ext.search.indexOf(this.s.searchFunction);
            while (searchIdx !== -1) {
                $.fn.dataTable.ext.search.splice(searchIdx, 1);
                searchIdx = $.fn.dataTable.ext.search.indexOf(this.s.searchFunction);
            }
            // If the datatables have been defined for the panes then also destroy these
            if (this.s.dtPane !== undefined) {
                this.s.dtPane.destroy();
            }
            this.s.listSet = false;
        }
        /**
         * Updates the number of filters that have been applied in the title
         */
        getPaneCount() {
            return this.s.dtPane !== undefined ?
                this.s.dtPane.rows({ selected: true }).data().toArray().length :
                0;
        }
        /**
         * Rebuilds the panes from the start having deleted the old ones
         * @param? last boolean to indicate if this is the last pane a selection was made in
         * @param? dataIn data to be used in buildPane
         * @param? init Whether this is the initial draw or not
         * @param? maintainSelection Whether the current selections are to be maintained over rebuild
         */
        rebuildPane(last = false, dataIn = null, init = null, maintainSelection = false) {
            this.clearData();
            let selectedRows = [];
            let prevEl = null;
            // When rebuilding strip all of the HTML Elements out of the container and start from scratch
            if (this.s.dtPane !== undefined) {
                if (maintainSelection) {
                    selectedRows = this.s.dtPane.rows({ selected: true }).data().toArray();
                }
                this.s.dtPane.clear().destroy();
                prevEl = $(this.dom.container).prev();
                this.destroy();
                this.s.dtPane = undefined;
                $.fn.dataTable.ext.search.push(this.s.searchFunction);
            }
            this.dom.container.removeClass(this.classes.hidden);
            this.s.displayed = false;
            this._buildPane(selectedRows, last, dataIn, init, prevEl);
            return this;
        }
        /**
         * removes the pane from the page and sets the displayed property to false.
         */
        removePane() {
            this.s.displayed = false;
            $(this.dom.container).hide();
        }
        /**
         * Sets the cascadeRegen property of the pane. Accessible from above because as SearchPanes.ts deals with the rebuilds.
         * @param val the boolean value that the cascadeRegen property is to be set to
         */
        setCascadeRegen(val) {
            this.s.cascadeRegen = val;
        }
        /**
         * This function allows the clearing property to be assigned. This is used when implementing cascadePane.
         * In setting this to true for the clearing of the panes selection on the deselects it forces the pane to
         * repopulate from the entire dataset not just the displayed values.
         * @param val the boolean value which the clearing property is to be assigned
         */
        setClear(val) {
            this.s.clearing = val;
        }
        /**
         * Updates the values of all of the panes
         * @param draw whether this has been triggered by a draw event or not
         */
        updatePane(draw = false) {
            this.s.updating = true;
            this._updateCommon(draw);
            this.s.updating = false;
        }
        /**
         * Updates the panes if one of the options to do so has been set to true
         *   rather than the filtered message when using viewTotal.
         */
        updateTable() {
            let selectedRows = this.s.dtPane.rows({ selected: true }).data().toArray();
            this.selections = selectedRows;
            this._searchExtras();
            // If either of the options that effect how the panes are displayed are selected then update the Panes
            if (this.c.cascadePanes || this.c.viewTotal) {
                this.updatePane();
            }
        }
        /**
         * Sets the listeners for the pane.
         *
         * Having it in it's own function makes it easier to only set them once
         */
        _setListeners() {
            let rowData = this.s.rowData;
            let t0;
            // When an item is selected on the pane, add these to the array which holds selected items.
            // Custom search will perform.
            this.s.dtPane.on('select.dtsp', () => {
                if (this.s.dt.page.info().serverSide && !this.s.updating) {
                    if (!this.s.serverSelecting) {
                        this.s.serverSelect = this.s.dtPane.rows({ selected: true }).data().toArray();
                        this.s.selectPresent = true;
                        this.s.dt.draw(false);
                    }
                }
                else {
                    clearTimeout(t0);
                    $(this.dom.clear).removeClass(this.classes.dull);
                    this.s.selectPresent = true;
                    if (!this.s.updating) {
                        this._makeSelection();
                    }
                    this.s.selectPresent = false;
                }
            });
            // When an item is deselected on the pane, re add the currently selected items to the array
            // which holds selected items. Custom search will be performed.
            this.s.dtPane.on('deselect.dtsp', () => {
                t0 = setTimeout(() => {
                    if (this.s.dt.page.info().serverSide && !this.s.updating) {
                        if (!this.s.serverSelecting) {
                            this.s.serverSelect = this.s.dtPane.rows({ selected: true }).data().toArray();
                            this.s.deselect = true;
                            this.s.dt.draw(false);
                        }
                    }
                    else {
                        this.s.deselect = true;
                        if (this.s.dtPane.rows({ selected: true }).data().toArray().length === 0) {
                            $(this.dom.clear).addClass(this.classes.dull);
                        }
                        this._makeSelection();
                        this.s.deselect = false;
                        this.s.dt.state.save();
                    }
                }, 50);
            });
            // When saving the state store all of the selected rows for preselection next time around
            this.s.dt.on('stateSaveParams.dtsp', (e, settings, data) => {
                // If the data being passed in is empty then a state clear must have occured so clear the panes state as well
                if ($.isEmptyObject(data)) {
                    this.s.dtPane.state.clear();
                    return;
                }
                let selected = [];
                let searchTerm;
                let order;
                let bins;
                let arrayFilter;
                // Get all of the data needed for the state save from the pane
                if (this.s.dtPane !== undefined) {
                    selected = this.s.dtPane.rows({ selected: true }).data().map(item => item.filter.toString()).toArray();
                    searchTerm = $(this.dom.searchBox).val();
                    order = this.s.dtPane.order();
                    bins = rowData.binsOriginal;
                    arrayFilter = rowData.arrayOriginal;
                }
                if (data.searchPanes === undefined) {
                    data.searchPanes = {};
                }
                if (data.searchPanes.panes === undefined) {
                    data.searchPanes.panes = [];
                }
                // Add the panes data to the state object
                data.searchPanes.panes.push({
                    arrayFilter,
                    bins,
                    id: this.s.index,
                    order,
                    searchTerm,
                    selected,
                });
            });
            this.s.dtPane.on('user-select.dtsp', (e, _dt, type, cell, originalEvent) => {
                originalEvent.stopPropagation();
            });
            // When the button to order by the name of the options is clicked then
            //  change the ordering to whatever it isn't currently
            $(this.dom.nameButton).on('click.dtsp', () => {
                let currentOrder = this.s.dtPane.order()[0][1];
                this.s.dtPane.order([0, currentOrder === 'asc' ? 'desc' : 'asc']).draw();
            });
            // When the button to order by the number of entries in the column is clicked then
            //  change the ordering to whatever it isn't currently
            $(this.dom.countButton).on('click.dtsp', () => {
                let currentOrder = this.s.dtPane.order()[0][1];
                this.s.dtPane.order([1, currentOrder === 'asc' ? 'desc' : 'asc']).draw();
            });
            // When the clear button is clicked reset the pane
            $(this.dom.clear).on('click.dtsp', () => {
                let searches = this.dom.container.find('.' + this.classes.search);
                searches.each(function () {
                    // set the value of the search box to be an empty string and then search on that, effectively reseting
                    $(this).val('');
                    $(this).trigger('input');
                });
                this.clearPane();
            });
            // When the search button is clicked then draw focus to the search box
            $(this.dom.searchButton).on('click.dtsp', () => {
                $(this.dom.searchBox).focus();
            });
            // When a character is inputted into the searchbox search the pane for matching values.
            // Doing it this way means that no button has to be clicked to trigger a search, it is done asynchronously
            $(this.dom.searchBox).on('input.dtsp', () => {
                this.s.dtPane.search($(this.dom.searchBox).val()).draw();
                this.s.dt.state.save();
            });
            // Make sure to save the state once the pane has been built
            this.s.dt.state.save();
            return true;
        }
        /**
         * Takes in potentially undetected rows and adds them to the array if they are not yet featured
         * @param filter the filter value of the potential row
         * @param display the display value of the potential row
         * @param sort the sort value of the potential row
         * @param type the type value of the potential row
         * @param arrayFilter the array to be populated
         * @param bins the bins to be populated
         */
        _addOption(filter, display, sort, type, arrayFilter, bins) {
            // If the filter is an array then take a note of this, and add the elements to the arrayFilter array
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
                                sort,
                                type
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
                else {
                    throw new Error('display and filter not the same length');
                }
            }
            // If the values were affected by othogonal data and are not an array then check if it is already present
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
                    return;
                }
            }
            // Otherwise we must just be adding an option
            else {
                arrayFilter.push({
                    display,
                    filter,
                    sort,
                    type
                });
            }
        }
        /**
         * Adds a row to the panes table
         * @param display the value to be displayed to the user
         * @param filter the value to be filtered on when searchpanes is implemented
         * @param shown the number of rows in the table that are currently visible matching this criteria
         * @param total the total number of rows in the table that match this criteria
         * @param sort the value to be sorted in the pane table
         * @param type the value of which the type is to be derived from
         */
        _addRow(display, filter, shown, total, sort, type) {
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
                display: display !== '' ? display : this.c.emptyMessage,
                filter,
                index,
                shown,
                sort: sort !== '' ? sort : this.c.emptyMessage,
                total,
                type,
            });
        }
        /**
         * Adjusts the layout of the top row when the screen is resized
         */
        _adjustTopRow() {
            let subContainers = this.dom.container.find('.' + this.classes.subRowsContainer);
            let subRow1 = this.dom.container.find('.dtsp-subRow1');
            let subRow2 = this.dom.container.find('.dtsp-subRow2');
            let topRow = this.dom.container.find('.' + this.classes.topRow);
            // If the width is 0 then it is safe to assume that the pane has not yet been displayed.
            //  Even if it has, if the width is 0 it won't make a difference if it has the narrow class or not
            if (($(subContainers[0]).width() < 252 || $(topRow[0]).width() < 252) && $(subContainers[0]).width() !== 0) {
                $(subContainers[0]).addClass(this.classes.narrow);
                $(subRow1[0]).addClass(this.classes.narrowSub).removeClass(this.classes.narrowSearch);
                $(subRow2[0]).addClass(this.classes.narrowSub).removeClass(this.classes.narrowButton);
            }
            else {
                $(subContainers[0]).removeClass(this.classes.narrow);
                $(subRow1[0]).removeClass(this.classes.narrowSub).addClass(this.classes.narrowSearch);
                $(subRow2[0]).removeClass(this.classes.narrowSub).addClass(this.classes.narrowButton);
            }
        }
        /**
         * Method to construct the actual pane.
         * @param selectedRows previously selected Rows to be reselected
         * @last boolean to indicate whether this pane was the last one to have a selection made
         */
        _buildPane(selectedRows = [], last = false, dataIn = null, init = null, prevEl = null) {
            // Aliases
            this.selections = [];
            let table = this.s.dt;
            let column = table.column(this.colExists ? this.s.index : 0);
            let colOpts = this.s.colOpts;
            let rowData = this.s.rowData;
            // Other Variables
            let countMessage = table.i18n('searchPanes.count', '{total}');
            let filteredMessage = table.i18n('searchPanes.countFiltered', '{shown} ({total})');
            let loadedFilter = table.state.loaded();
            // If the listeners have not been set yet then using the latest state may result in funny errors
            if (this.s.listSet) {
                loadedFilter = table.state();
            }
            // If it is not a custom pane in place
            if (this.colExists) {
                let idx = -1;
                if (loadedFilter && loadedFilter.searchPanes && loadedFilter.searchPanes.panes) {
                    for (let i = 0; i < loadedFilter.searchPanes.panes.length; i++) {
                        if (loadedFilter.searchPanes.panes[i].id === this.s.index) {
                            idx = i;
                            break;
                        }
                    }
                }
                // Perform checks that do not require populate pane to run
                if ((colOpts.show === false
                    || (colOpts.show !== undefined && colOpts.show !== true)) &&
                    idx === -1) {
                    this.dom.container.addClass(this.classes.hidden);
                    this.s.displayed = false;
                    return false;
                }
                else if (colOpts.show === true || idx !== -1) {
                    this.s.displayed = true;
                }
                if (!this.s.dt.page.info().serverSide) {
                    // Only run populatePane if the data has not been collected yet
                    if (rowData.arrayFilter.length === 0) {
                        this._populatePane(last);
                        if (loadedFilter && loadedFilter.searchPanes && loadedFilter.searchPanes.panes) {
                            // If the index is not found then no data has been added to the state for this pane,
                            //  which will only occur if it has previously failed to meet the criteria to be
                            //  displayed, therefore we can just hide it again here
                            if (idx !== -1) {
                                rowData.binsOriginal = loadedFilter.searchPanes.panes[idx].bins;
                                rowData.arrayOriginal = loadedFilter.searchPanes.panes[idx].arrayFilter;
                            }
                            else {
                                this.dom.container.addClass(this.classes.hidden);
                                this.s.displayed = false;
                                return;
                            }
                        }
                        else {
                            rowData.arrayOriginal = rowData.arrayFilter;
                            rowData.binsOriginal = rowData.bins;
                        }
                    }
                    let binLength = Object.keys(rowData.binsOriginal).length;
                    let uniqueRatio = this._uniqueRatio(binLength, table.rows()[0].length);
                    // Don't show the pane if there isn't enough variance in the data, or there is only 1 entry for that pane
                    if (this.s.displayed === false && ((colOpts.show === undefined && colOpts.threshold === null ?
                        uniqueRatio > this.c.threshold :
                        uniqueRatio > colOpts.threshold)
                        || (colOpts.show !== true && binLength <= 1))) {
                        this.dom.container.addClass(this.classes.hidden);
                        this.s.displayed = false;
                        return;
                    }
                    // If the option viewTotal is true then find
                    // the total count for the whole table to display alongside the displayed count
                    if (this.c.viewTotal && rowData.arrayTotals.length === 0) {
                        this._detailsPane();
                    }
                    else {
                        rowData.binsTotal = rowData.bins;
                    }
                    this.dom.container.addClass(this.classes.show);
                    this.s.displayed = true;
                }
                else if (dataIn !== null) {
                    if (dataIn.tableLength !== undefined) {
                        this.s.tableLength = dataIn.tableLength;
                    }
                    else if (this.s.tableLength === null || table.rows()[0].length > this.s.tableLength) {
                        this.s.tableLength = table.rows()[0].length;
                    }
                    let colTitle = table.column(this.s.index).dataSrc();
                    if (dataIn[colTitle] !== undefined) {
                        for (let dataPoint of dataIn[colTitle]) {
                            this.s.rowData.arrayFilter.push({
                                display: dataPoint.label,
                                filter: dataPoint.value,
                                sort: dataPoint.label,
                                type: dataPoint.label
                            });
                            this.s.rowData.bins[dataPoint.value] = dataPoint.count;
                            this.s.rowData.binsTotal[dataPoint.value] = dataPoint.total;
                        }
                    }
                    let binLength = Object.keys(rowData.binsTotal).length;
                    let uniqueRatio = this._uniqueRatio(binLength, this.s.tableLength);
                    // Don't show the pane if there isn't enough variance in the data, or there is only 1 entry for that pane
                    if (this.s.displayed === false && ((colOpts.show === undefined && colOpts.threshold === null ?
                        uniqueRatio > this.c.threshold :
                        uniqueRatio > colOpts.threshold)
                        || (colOpts.show !== true && binLength <= 1))) {
                        this.dom.container.addClass(this.classes.hidden);
                        this.s.displayed = false;
                        return;
                    }
                    this.s.displayed = true;
                }
            }
            else {
                this.s.displayed = true;
            }
            // If the variance is accceptable then display the search pane
            this._displayPane();
            if (!this.s.listSet) {
                // Here, when the state is loaded if the data object on the original table is empty,
                //  then a state.clear() must have occurred, so delete all of the panes tables state objects too.
                this.dom.dtP.on('stateLoadParams.dt', (e, settings, data) => {
                    if ($.isEmptyObject(table.state.loaded())) {
                        $.each(data, (index, value) => {
                            delete data[index];
                        });
                    }
                });
            }
            // Add the container to the document in its original location
            if (prevEl !== null && $(this.dom.panesContainer).has(prevEl).length > 0) {
                $(this.dom.panesContainer).insertAfter(prevEl);
            }
            else {
                $(this.dom.panesContainer).prepend(this.dom.container);
            }
            // Declare the datatable for the pane
            let errMode = $.fn.dataTable.ext.errMode;
            $.fn.dataTable.ext.errMode = 'none';
            let haveScroller = DataTable.Scroller;
            this.s.dtPane = $(this.dom.dtP).DataTable($.extend(true, {
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
                            let message;
                            this.s.filteringActive && this.c.viewTotal
                                ? message = filteredMessage.replace(/{total}/, row.total)
                                : message = countMessage.replace(/{total}/, row.total);
                            message = message.replace(/{shown}/, row.shown);
                            while (message.indexOf('{total}') !== -1) {
                                message = message.replace(/{total}/, row.total);
                            }
                            while (message.indexOf('{shown}') !== -1) {
                                message = message.replace(/{shown}/, row.shown);
                            }
                            // We are displaying the count in the same columne as the name of the search option.
                            // This is so that there is not need to call columns.adjust(), which in turn speeds up the code
                            let displayMessage = '';
                            let pill = '<span class="' + this.classes.pill + '">' + message + '</span>';
                            if (this.c.hideCount || colOpts.hideCount) {
                                pill = '';
                            }
                            if (!this.c.dataLength) {
                                displayMessage = '<span class="' + this.classes.name + '">' + data + '</span>' + pill;
                            }
                            else if (data !== null && data.length > this.c.dataLength) {
                                displayMessage = '<span class="' + this.classes.name + '">'
                                    + data.substr(0, this.c.dataLength) + '...'
                                    + '</span>'
                                    + pill;
                            }
                            else {
                                displayMessage = '<span class="' + this.classes.name + '">' + data + '</span>' + pill;
                            }
                            return displayMessage;
                        },
                        targets: 0,
                        // Accessing the private datatables property to set type based on the original table.
                        // This is null if not defined by the user, meaning that automatic type detection would take place
                        type: table.settings()[0].aoColumns[this.s.index] !== undefined ?
                            table.settings()[0].aoColumns[this.s.index]._sManualType :
                            null,
                    },
                    {
                        className: 'dtsp-countColumn ' + this.classes.badgePill,
                        data: 'total',
                        targets: 1,
                        visible: false
                    }
                ],
                deferRender: true,
                dom: 't',
                info: false,
                paging: haveScroller ? true : false,
                scrollY: '200px',
                scroller: haveScroller ? true : false,
                select: true,
                stateSave: table.settings()[0].oFeatures.bStateSave ? true : false,
            }, this.c.dtOpts, colOpts !== undefined ? colOpts.dtOpts : {}, (this.customPaneSettings !== null && this.customPaneSettings.dtOpts !== undefined)
                ? this.customPaneSettings.dtOpts
                : {}));
            $(this.dom.dtP).addClass(this.classes.table);
            // This is hacky but necessary for when datatables is generating the column titles automatically
            $(this.dom.searchBox).attr('placeholder', colOpts.header !== undefined
                ? colOpts.header
                : this.colExists
                    ? table.settings()[0].aoColumns[this.s.index].sTitle
                    : this.customPaneSettings.header || 'Custom Pane');
            // As the pane table is not in the document yet we must initialise select ourselves
            $.fn.dataTable.select.init(this.s.dtPane);
            $.fn.dataTable.ext.errMode = errMode;
            // If it is not a custom pane
            if (this.colExists) {
                // On initialisation, do we need to set a filtering value from a
                // saved state or init option?
                let search = column.search();
                search = search ? search.substr(1, search.length - 2).split('|') : [];
                // Count the number of empty cells
                let count = 0;
                rowData.arrayFilter.forEach(element => {
                    if (element.filter === '') {
                        count++;
                    }
                });
                // Add all of the search options to the pane
                for (let i = 0, ien = rowData.arrayFilter.length; i < ien; i++) {
                    if (this.s.dt.page.info().serverSide &&
                        (!this.c.cascadePanes ||
                            (this.c.cascadePanes && rowData.bins[rowData.arrayFilter[i].filter] !== 0) ||
                            (this.c.cascadePanes && init !== null))) {
                        let row = this._addRow(rowData.arrayFilter[i].display, rowData.arrayFilter[i].filter, rowData.bins[rowData.arrayFilter[i].filter], this.c.viewTotal
                            ? String(rowData.binsTotal[rowData.arrayFilter[i].filter])
                            : rowData.bins[rowData.arrayFilter[i].filter], rowData.arrayFilter[i].sort, rowData.arrayFilter[i].type);
                        if (colOpts.preSelect !== undefined && colOpts.preSelect.indexOf(rowData.arrayFilter[i].filter) !== -1) {
                            row.select();
                        }
                        for (let option of this.s.serverSelect) {
                            if (option.filter === rowData.arrayFilter[i].filter) {
                                this.s.serverSelecting = true;
                                row.select();
                                this.s.serverSelecting = false;
                            }
                        }
                    }
                    else if (!this.s.dt.page.info().serverSide &&
                        rowData.arrayFilter[i] &&
                        (rowData.bins[rowData.arrayFilter[i].filter] !== undefined || !this.c.cascadePanes)) {
                        let row = this._addRow(rowData.arrayFilter[i].display, rowData.arrayFilter[i].filter, rowData.bins[rowData.arrayFilter[i].filter], rowData.binsTotal[rowData.arrayFilter[i].filter], rowData.arrayFilter[i].sort, rowData.arrayFilter[i].type);
                        if (colOpts.preSelect !== undefined && colOpts.preSelect.indexOf(rowData.arrayFilter[i].filter) !== -1) {
                            row.select();
                        }
                    }
                    else if (!this.s.dt.page.info().serverSide) {
                        this._addRow(this.c.emptyMessage, count, count, this.c.emptyMessage, this.c.emptyMessage, this.c.emptyMessage);
                    }
                }
            }
            // If there are custom options set or it is a custom pane then get them
            if (colOpts.options !== undefined ||
                (this.customPaneSettings !== null && this.customPaneSettings.options !== undefined)) {
                this._getComparisonRows();
            }
            DataTable.select.init(this.s.dtPane);
            // Display the pane
            this.s.dtPane.draw();
            if (!this.s.listSet) {
                this._setListeners();
                this.s.listSet = true;
            }
            for (let selection of selectedRows) {
                if (selection !== undefined) {
                    for (let row of this.s.dtPane.rows().indexes().toArray()) {
                        if (this.s.dtPane.row(row).data() !== undefined && selection.filter === this.s.dtPane.row(row).data().filter) {
                            // If this is happening when serverSide processing is happening then different behaviour is needed
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
            // Reload the selection, searchbox entry and ordering from the previous state
            if (loadedFilter && loadedFilter.searchPanes && loadedFilter.searchPanes.panes) {
                if (!this.c.cascadePanes) {
                    this._reloadSelect(loadedFilter);
                }
                for (let pane of loadedFilter.searchPanes.panes) {
                    if (pane.id === this.s.index) {
                        $(this.dom.searchBox).val(pane.searchTerm);
                        this.s.dt.order(pane.order);
                    }
                }
            }
            // Make sure to save the state once the pane has been built
            this.s.dt.state.save();
            return true;
        }
        /**
         * Update the array which holds the display and filter values for the table
         */
        _detailsPane() {
            let table = this.s.dt;
            this.s.rowData.arrayTotals = [];
            this.s.rowData.binsTotal = {};
            let settings = this.s.dt.settings()[0];
            table.rows().every((rowIdx) => {
                this._populatePaneArray(rowIdx, this.s.rowData.arrayTotals, settings, this.s.rowData.binsTotal);
            });
        }
        /**
         * Appends all of the HTML elements to their relevant parent Elements
         */
        _displayPane() {
            let container = this.dom.container;
            let colOpts = this.s.colOpts;
            let layVal = parseInt(this.c.layout.split('-')[1], 10);
            //  Empty everything to start again
            $(this.dom.topRow).empty();
            $(this.dom.dtP).empty();
            $(this.dom.topRow).addClass(this.classes.topRow);
            // If there are more than 3 columns defined then make there be a smaller gap between the panes
            if (layVal > 3) {
                $(this.dom.container).addClass(this.classes.smallGap);
            }
            $(this.dom.topRow).addClass(this.classes.subRowsContainer);
            $(this.dom.upper).appendTo(this.dom.topRow);
            $(this.dom.lower).appendTo(this.dom.topRow);
            $(this.dom.searchCont).appendTo(this.dom.upper);
            $(this.dom.buttonGroup).appendTo(this.dom.lower);
            // If no selections have been made in the pane then disable the clear button
            if (this.c.dtOpts.searching === false ||
                (colOpts.dtOpts !== undefined &&
                    colOpts.dtOpts.searching === false) ||
                (!this.c.controls || !colOpts.controls) ||
                (this.customPaneSettings !== null &&
                    this.customPaneSettings.dtOpts !== undefined &&
                    this.customPaneSettings.dtOpts.searching !== undefined &&
                    !this.customPaneSettings.dtOpts.searching)) {
                $(this.dom.searchBox).attr('disabled', 'disabled')
                    .removeClass(this.classes.paneInputButton)
                    .addClass(this.classes.disabledButton);
            }
            $(this.dom.searchBox).appendTo(this.dom.searchCont);
            // Create the contents of the searchCont div. Worth noting that this function will change when using semantic ui
            this._searchContSetup();
            // If the clear button is allowed to show then display it
            if (this.c.clear && this.c.controls && colOpts.controls) {
                $(this.dom.clear).appendTo(this.dom.buttonGroup);
            }
            if (this.c.orderable && colOpts.orderable && this.c.controls && colOpts.controls) {
                $(this.dom.nameButton).appendTo(this.dom.buttonGroup);
            }
            // If the count column is hidden then don't display the ordering button for it
            if (!this.c.hideCount &&
                !colOpts.hideCount &&
                this.c.orderable &&
                colOpts.orderable &&
                this.c.controls &&
                colOpts.controls) {
                $(this.dom.countButton).appendTo(this.dom.buttonGroup);
            }
            $(this.dom.topRow).prependTo(this.dom.container);
            $(container).append(this.dom.dtP);
            $(container).show();
        }
        /**
         * Gets the options for the row for the customPanes
         * @returns {object} The options for the row extended to include the options from the user.
         */
        _getBonusOptions() {
            // We need to reset the thresholds as if they have a value in colOpts then that value will be used
            let defaultMutator = {
                orthogonal: {
                    threshold: null
                },
                threshold: null
            };
            return $.extend(true, {}, SearchPane.defaults, defaultMutator, this.c !== undefined ? this.c : {});
        }
        /**
         * Adds the custom options to the pane
         * @returns {Array} Returns the array of rows which have been added to the pane
         */
        _getComparisonRows() {
            let colOpts = this.s.colOpts;
            // Find the appropriate options depending on whether this is a pane for a specific column or a custom pane
            let options = colOpts.options !== undefined
                ? colOpts.options
                : this.customPaneSettings !== null && this.customPaneSettings.options !== undefined
                    ? this.customPaneSettings.options
                    : undefined;
            if (options === undefined) {
                return;
            }
            let tableVals = this.s.dt.rows({ search: 'applied' }).data().toArray();
            let appRows = this.s.dt.rows({ search: 'applied' });
            let tableValsTotal = this.s.dt.rows().data().toArray();
            let allRows = this.s.dt.rows();
            let rows = [];
            // Clear all of the other rows from the pane, only custom options are to be displayed when they are defined
            this.s.dtPane.clear();
            for (let comp of options) {
                // Initialise the object which is to be placed in the row
                let insert = comp.label !== '' ? comp.label : this.c.emptyMessage;
                let comparisonObj = {
                    display: insert,
                    filter: typeof comp.value === 'function' ? comp.value : [],
                    shown: 0,
                    sort: insert,
                    total: 0,
                    type: insert,
                };
                // If a custom function is in place
                if (typeof comp.value === 'function') {
                    // Count the number of times the function evaluates to true for the data currently being displayed
                    for (let tVal = 0; tVal < tableVals.length; tVal++) {
                        if (comp.value.call(this.s.dt, tableVals[tVal], appRows[0][tVal])) {
                            comparisonObj.shown++;
                        }
                    }
                    // Count the number of times the function evaluates to true for the original data in the Table
                    for (let i = 0; i < tableValsTotal.length; i++) {
                        if (comp.value.call(this.s.dt, tableValsTotal[i], allRows[0][i])) {
                            comparisonObj.total++;
                        }
                    }
                    // Update the comparisonObj
                    if (typeof comparisonObj.filter !== 'function') {
                        comparisonObj.filter.push(comp.filter);
                    }
                }
                // If cascadePanes is not active or if it is and the comparisonObj should be shown then add it to the pane
                if (!this.c.cascadePanes || (this.c.cascadePanes && comparisonObj.shown !== 0)) {
                    rows.push(this._addRow(comparisonObj.display, comparisonObj.filter, comparisonObj.shown, comparisonObj.total, comparisonObj.sort, comparisonObj.type));
                }
            }
            return rows;
        }
        /**
         * Gets the options for the row for the customPanes
         * @returns {object} The options for the row extended to include the options from the user.
         */
        _getOptions() {
            let table = this.s.dt;
            // We need to reset the thresholds as if they have a value in colOpts then that value will be used
            let defaultMutator = {
                orthogonal: {
                    threshold: null
                },
                threshold: null
            };
            return $.extend(true, {}, SearchPane.defaults, defaultMutator, table.settings()[0].aoColumns[this.s.index].searchPanes);
        }
        /**
         * This method allows for changes to the panes and table to be made when a selection or a deselection occurs
         * @param select Denotes whether a selection has been made or not
         */
        _makeSelection() {
            this.updateTable();
            this.s.updating = true;
            this.s.dt.draw();
            this.s.updating = false;
        }
        /**
         * Fill the array with the values that are currently being displayed in the table
         * @param last boolean to indicate whether this was the last pane a selection was made in
         */
        _populatePane(last = false) {
            let table = this.s.dt;
            this.s.rowData.arrayFilter = [];
            this.s.rowData.bins = {};
            let settings = this.s.dt.settings()[0];
            // If cascadePanes or viewTotal are active it is necessary to get the data which is currently
            //  being displayed for their functionality. Also make sure that this was not the last pane to have a selection made
            if (!this.s.dt.page.info().serverSide) {
                let indexArray = (this.c.cascadePanes || this.c.viewTotal) && (!this.s.clearing && !last) ?
                    table.rows({ search: 'applied' }).indexes() :
                    table.rows().indexes();
                for (let index of indexArray.toArray()) {
                    this._populatePaneArray(index, this.s.rowData.arrayFilter, settings);
                }
            }
        }
        /**
         * Populates an array with all of the data for the table
         * @param rowIdx The current row index to be compared
         * @param arrayFilter The array that is to be populated with row Details
         * @param bins The bins object that is to be populated with the row counts
         */
        _populatePaneArray(rowIdx, arrayFilter, settings, bins = this.s.rowData.bins) {
            let colOpts = this.s.colOpts;
            // Retrieve the rendered data from the cell using the fnGetCellData function
            //  rather than the cell().render API method for optimisation
            if (typeof colOpts.orthogonal === 'string') {
                let rendered = settings.oApi._fnGetCellData(settings, rowIdx, this.s.index, colOpts.orthogonal);
                this.s.rowData.filterMap.set(rowIdx, rendered);
                this._addOption(rendered, rendered, rendered, rendered, arrayFilter, bins);
            }
            else {
                let filter = settings.oApi._fnGetCellData(settings, rowIdx, this.s.index, colOpts.orthogonal.search);
                this.s.rowData.filterMap.set(rowIdx, filter);
                if (!bins[filter]) {
                    bins[filter] = 1;
                    this._addOption(filter, settings.oApi._fnGetCellData(settings, rowIdx, this.s.index, colOpts.orthogonal.display), settings.oApi._fnGetCellData(settings, rowIdx, this.s.index, colOpts.orthogonal.sort), settings.oApi._fnGetCellData(settings, rowIdx, this.s.index, colOpts.orthogonal.type), arrayFilter, bins);
                    this.s.rowData.totalOptions++;
                }
                else {
                    bins[filter]++;
                    this.s.rowData.totalOptions++;
                    return;
                }
            }
        }
        /**
         * Reloads all of the previous selects into the panes
         * @param loadedFilter The loaded filters from a previous state
         */
        _reloadSelect(loadedFilter) {
            // If the state was not saved don't selected any
            if (loadedFilter === undefined) {
                return;
            }
            let idx;
            // For each pane, check that the loadedFilter list exists and is not null,
            // find the id of each search item and set it to be selected.
            for (let i = 0; i < loadedFilter.searchPanes.panes.length; i++) {
                if (loadedFilter.searchPanes.panes[i].id === this.s.index) {
                    idx = i;
                    break;
                }
            }
            if (idx !== undefined) {
                let table = this.s.dtPane;
                let rows = table.rows({ order: 'index' }).data().map(item => item.filter !== null ?
                    item.filter.toString() :
                    null).toArray();
                for (let filter of loadedFilter.searchPanes.panes[idx].selected) {
                    let id = -1;
                    if (filter !== null) {
                        id = rows.indexOf(filter.toString());
                    }
                    if (id > -1) {
                        table.row(id).select();
                        this.s.dt.state.save();
                    }
                }
            }
        }
        /**
         * This method decides whether a row should contribute to the pane or not
         * @param filter the value that the row is to be filtered on
         * @param dataIndex the row index
         */
        _search(filter, dataIndex) {
            let colOpts = this.s.colOpts;
            let table = this.s.dt;
            // For each item selected in the pane, check if it is available in the cell
            for (let colSelect of this.selections) {
                // if the filter is an array then is the column present in it
                if (Array.isArray(filter)) {
                    if (filter.indexOf(colSelect.filter) !== -1) {
                        return true;
                    }
                }
                // if the filter is a function then does it meet the criteria of that function or not
                else if (typeof colSelect.filter === 'function') {
                    if (colSelect.filter.call(table, table.row(dataIndex).data(), dataIndex)) {
                        if (colOpts.combiner === 'or') {
                            return true;
                        }
                    }
                    // If the combiner is an "and" then we need to check against all possible selections
                    //  so if it fails here then the and is not met and return false
                    else if (colOpts.combiner === 'and') {
                        return false;
                    }
                }
                // otherwise if the two filter values are equal then return true
                else if (filter === colSelect.filter) {
                    return true;
                }
            }
            // If the combiner is an and then we need to check against all possible selections
            //  so return true here if so because it would have returned false earlier if it had failed
            if (colOpts.combiner === 'and') {
                return true;
            }
            // Otherwise it hasn't matched with anything by this point so it must be false
            else {
                return false;
            }
        }
        /**
         * Creates the contents of the searchCont div
         *
         * NOTE This is overridden when semantic ui styling in order to integrate the search button into the text box.
         */
        _searchContSetup() {
            if (this.c.controls && this.s.colOpts.controls) {
                $(this.dom.searchButton).appendTo(this.dom.searchLabelCont);
            }
            if (!(this.c.dtOpts.searching === false ||
                this.s.colOpts.dtOpts.searching === false ||
                (this.customPaneSettings !== null &&
                    this.customPaneSettings.dtOpts !== undefined &&
                    this.customPaneSettings.dtOpts.searching !== undefined &&
                    !this.customPaneSettings.dtOpts.searching))) {
                $(this.dom.searchLabelCont).appendTo(this.dom.searchCont);
            }
        }
        /**
         * Adds outline to the pane when a selection has been made
         */
        _searchExtras() {
            let updating = this.s.updating;
            this.s.updating = true;
            let filters = this.s.dtPane.rows({ selected: true }).data().pluck('filter').toArray();
            let nullIndex = filters.indexOf(this.c.emptyMessage);
            let container = $(this.s.dtPane.table().container());
            // If null index is found then search for empty cells as a filter.
            if (nullIndex > -1) {
                filters[nullIndex] = '';
            }
            // If a filter has been applied then outline the respective pane, remove it when it no longer is.
            if (filters.length > 0) {
                container.addClass(this.classes.selected);
            }
            else if (filters.length === 0) {
                container.removeClass(this.classes.selected);
            }
            this.s.updating = updating;
        }
        /**
         * Finds the ratio of the number of different options in the table to the number of rows
         * @param bins the number of different options in the table
         * @param rowCount the total number of rows in the table
         * @returns {number} returns the ratio
         */
        _uniqueRatio(bins, rowCount) {
            if (rowCount > 0 && this.s.rowData.totalOptions > 0) {
                return bins / this.s.rowData.totalOptions;
            }
            else {
                return 1;
            }
        }
        /**
         * updates the options within the pane
         * @param draw a flag to define whether this has been called due to a draw event or not
         */
        _updateCommon(draw = false) {
            // Update the panes if doing a deselect. if doing a select then
            // update all of the panes except for the one causing the change
            if (this.s.dtPane !== undefined &&
                ((!this.s.filteringActive || this.c.cascadePanes) || draw === true) &&
                (this.c.cascadePanes !== true || this.s.selectPresent !== true) && !this.s.lastSelect) {
                let colOpts = this.s.colOpts;
                let selected = this.s.dtPane.rows({ selected: true }).data().toArray();
                let scrollTop = $(this.s.dtPane.table().node()).parent()[0].scrollTop;
                let rowData = this.s.rowData;
                // Clear the pane in preparation for adding the updated search options
                this.s.dtPane.clear();
                // If it is not a custom pane
                if (this.colExists) {
                    // Only run populatePane if the data has not been collected yet
                    if (rowData.arrayFilter.length === 0) {
                        this._populatePane();
                    }
                    // If cascadePanes is active and the table has returned to its default state then
                    //  there is a need to update certain parts ofthe rowData.
                    else if (this.c.cascadePanes
                        && this.s.dt.rows().data().toArray().length === this.s.dt.rows({ search: 'applied' }).data().toArray().length) {
                        rowData.arrayFilter = rowData.arrayOriginal;
                        rowData.bins = rowData.binsOriginal;
                    }
                    // Otherwise if viewTotal or cascadePanes is active then the data from the table must be read.
                    else if (this.c.viewTotal || this.c.cascadePanes) {
                        this._populatePane();
                    }
                    // If the viewTotal option is selected then find the totals for the table
                    if (this.c.viewTotal) {
                        this._detailsPane();
                    }
                    else {
                        rowData.binsTotal = rowData.bins;
                    }
                    if (this.c.viewTotal && !this.c.cascadePanes) {
                        rowData.arrayFilter = rowData.arrayTotals;
                    }
                    for (let dataP of rowData.arrayFilter) {
                        // If both view Total and cascadePanes have been selected and the count of the row is not 0 then add it to pane
                        // Do this also if the viewTotal option has been selected and cascadePanes has not
                        if (dataP && ((rowData.bins[dataP.filter] !== undefined && rowData.bins[dataP.filter] !== 0 && this.c.cascadePanes)
                            || !this.c.cascadePanes
                            || this.s.clearing)) {
                            let row = this._addRow(dataP.display, dataP.filter, !this.c.viewTotal
                                ? rowData.bins[dataP.filter]
                                : rowData.bins[dataP.filter] !== undefined
                                    ? rowData.bins[dataP.filter]
                                    : 0, this.c.viewTotal
                                ? String(rowData.binsTotal[dataP.filter])
                                : rowData.bins[dataP.filter], dataP.sort, dataP.type);
                            // Find out if the filter was selected in the previous search, if so select it and remove from array.
                            let selectIndex = selected.findIndex(function (element) {
                                return element.filter === dataP.filter;
                            });
                            if (selectIndex !== -1) {
                                row.select();
                                selected.splice(selectIndex, 1);
                            }
                        }
                    }
                }
                if ((colOpts.searchPanes !== undefined && colOpts.searchPanes.options !== undefined) ||
                    colOpts.options !== undefined ||
                    (this.customPaneSettings !== null && this.customPaneSettings.options !== undefined)) {
                    let rows = this._getComparisonRows();
                    for (let row of rows) {
                        let selectIndex = selected.findIndex(function (element) {
                            if (element.display === row.data().display) {
                                return true;
                            }
                        });
                        if (selectIndex !== -1) {
                            row.select();
                            selected.splice(selectIndex, 1);
                        }
                    }
                }
                // Add search options which were previously selected but whos results are no
                // longer present in the resulting data set.
                for (let selectedEl of selected) {
                    let row = this._addRow(selectedEl.display, selectedEl.filter, 0, this.c.viewTotal
                        ? selectedEl.total
                        : 0, selectedEl.filter, selectedEl.filter);
                    this.s.updating = true;
                    row.select();
                    this.s.updating = false;
                }
                this.s.dtPane.draw();
                this.s.dtPane.table().node().parentNode.scrollTop = scrollTop;
            }
        }
    }
    SearchPane.version = '1.0.1';
    SearchPane.classes = {
        buttonGroup: 'dtsp-buttonGroup',
        buttonSub: 'dtsp-buttonSub',
        clear: 'dtsp-clear',
        clearAll: 'dtsp-clearAll',
        clearButton: 'clearButton',
        container: 'dtsp-searchPane',
        countButton: 'dtsp-countButton',
        disabledButton: 'dtsp-disabledButton',
        dull: 'dtsp-dull',
        hidden: 'dtsp-hidden',
        hide: 'dtsp-hide',
        layout: 'dtsp-',
        name: 'dtsp-name',
        nameButton: 'dtsp-nameButton',
        narrow: 'dtsp-narrow',
        paneButton: 'dtsp-paneButton',
        paneInputButton: 'dtsp-paneInputButton',
        pill: 'dtsp-pill',
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
        topRow: 'dtsp-topRow',
    };
    // Define SearchPanes default options
    SearchPane.defaults = {
        cascadePanes: false,
        clear: true,
        combiner: 'or',
        controls: true,
        container(dt) {
            return dt.table().container();
        },
        dataLength: 30,
        dtOpts: {},
        emptyMessage: '<i>No Data</i>',
        hideCount: false,
        layout: 'columns-3',
        name: undefined,
        orderable: true,
        orthogonal: {
            display: 'display',
            hideCount: false,
            search: 'filter',
            show: undefined,
            sort: 'sort',
            threshold: 0.6,
            type: 'type'
        },
        preSelect: [],
        threshold: 0.6,
        viewTotal: false,
    };

    let $$1;
    let DataTable$1;
    function setJQuery$1(jq) {
        $$1 = jq;
        DataTable$1 = jq.fn.dataTable;
    }
    class SearchPanes {
        constructor(paneSettings, opts, fromInit = false) {
            this.regenerating = false;
            // Check that the required version of DataTables is included
            if (!DataTable$1 || !DataTable$1.versionCheck || !DataTable$1.versionCheck('1.10.0')) {
                throw new Error('SearchPane requires DataTables 1.10 or newer');
            }
            // Check that Select is included
            if (!DataTable$1.select) {
                throw new Error('SearchPane requires Select');
            }
            let table = new DataTable$1.Api(paneSettings);
            this.classes = $$1.extend(true, {}, SearchPanes.classes);
            // Get options from user
            this.c = $$1.extend(true, {}, SearchPanes.defaults, opts);
            // Add extra elements to DOM object including clear
            this.dom = {
                clearAll: $$1('<button type="button">Clear All</button>').addClass(this.classes.clearAll),
                container: $$1('<div/>').addClass(this.classes.panes).text(table.i18n('searchPanes.loadMessage', 'Loading Search Panes...')),
                emptyMessage: $$1('<div/>').addClass(this.classes.emptyMessage),
                options: $$1('<div/>').addClass(this.classes.container),
                panes: $$1('<div/>').addClass(this.classes.container),
                title: $$1('<div/>').addClass(this.classes.title),
                titleRow: $$1('<div/>').addClass(this.classes.titleRow),
                wrapper: $$1('<div/>'),
            };
            this.s = {
                colOpts: [],
                dt: table,
                filterPane: -1,
                panes: [],
                selectionList: [],
                serverData: {},
                updating: false,
            };
            if (table.settings()[0]._searchPanes !== undefined) {
                return;
            }
            // We are using the xhr event to rebuild the panes if required due to viewTotal being enabled
            // If viewTotal is not enabled then we simply update the data from the server
            table.on('xhr', (e, settings, json, xhr) => {
                if (json.searchPanes && json.searchPanes.options) {
                    this.s.serverData = json.searchPanes.options;
                    this.s.serverData.tableLength = json.recordsTotal;
                    if (this.c.viewTotal || this.c.cascadePanes) {
                        this._serverTotals();
                    }
                }
            });
            table.settings()[0]._searchPanes = this;
            this.dom.clearAll.text(table.i18n('searchPanes.clearMessage', 'Clear All'));
            this._getState();
            if (this.s.dt.settings()[0]._bInitComplete || fromInit) {
                this._paneDeclare(table, paneSettings, opts);
            }
            else {
                table.one('preInit.dt', (settings) => {
                    this._paneDeclare(table, paneSettings, opts);
                });
            }
        }
        /**
         * Clear the selections of all of the panes
         */
        clearSelections() {
            // Load in all of the searchBoxes in the documents
            let searches = this.dom.container.find(this.classes.search);
            // For each searchBox set the input text to be empty and then trigger
            //  an input on them so that they no longer filter the panes
            searches.each(function () {
                $$1(this).val('');
                $$1(this).trigger('input');
            });
            let returnArray = [];
            // For every pane, clear the selections in the pane
            for (let pane of this.s.panes) {
                if (pane.s.dtPane !== undefined) {
                    returnArray.push(pane.clearPane());
                }
            }
            this.s.dt.draw();
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
            $$1(this.dom.emptyMessage).remove();
            // As a rebuild from scratch is required, empty the searchpanes container.
            let returnArray = [];
            // Rebuild each pane individually, if a specific pane has been selected then only rebuild that one
            $$1(this.dom.panes).empty();
            for (let pane of this.s.panes) {
                if (targetIdx !== false && pane.s.index !== targetIdx) {
                    $$1(this.dom.panes).append(pane.dom.container);
                    continue;
                }
                pane.clearData();
                returnArray.push(
                // Pass a boolean to say whether this is the last choice made for maintaining selections when rebuilding
                pane.rebuildPane(this.s.selectionList[this.s.selectionList.length - 1] !== undefined ?
                    pane.s.index === this.s.selectionList[this.s.selectionList.length - 1].index :
                    false, this.s.dt.page.info().serverSide ?
                    this.s.serverData :
                    undefined, null, maintainSelection));
                $$1(this.dom.panes).append(pane.dom.container);
            }
            if (this.c.cascadePanes || this.c.viewTotal) {
                this.redrawPanes(true);
            }
            else {
                this._updateSelection();
            }
            // Attach panes, clear buttons, and title bar to the document
            this._updateFilterCount();
            this._attachPaneContainer();
            // If a single pane has been rebuilt then return only that pane
            if (returnArray.length === 1) {
                return returnArray[0];
            }
            // Otherwise return all of the panes that have been rebuilt
            else {
                return returnArray;
            }
        }
        /**
         * Redraws all of the panes
         */
        redrawPanes(rebuild = false) {
            let table = this.s.dt;
            // Only do this if the redraw isn't being triggered by the panes updating themselves
            if (!this.s.updating && !this.s.dt.page.info().serverSide) {
                let filterActive = true;
                let filterPane = this.s.filterPane;
                // If the number of rows currently visible is equal to the number of rows in the table
                //  then there can't be any filtering taking place
                if (table.rows({ search: 'applied' }).data().toArray().length === table.rows().data().toArray().length) {
                    filterActive = false;
                }
                // Otherwise if viewTotal is active then it is necessary to determine which panes a select is present in.
                //  If there is only one pane with a selection present then it should not show the filtered message as
                //  more selections may be made in that pane.
                else if (this.c.viewTotal) {
                    for (let pane of this.s.panes) {
                        if (pane.s.dtPane !== undefined) {
                            let selectLength = pane.s.dtPane.rows({ selected: true }).data().toArray().length;
                            // If filterPane === -1 then a pane with a selection has not been found yet, so set filterPane to that panes index
                            if (selectLength > 0 && filterPane === -1) {
                                filterPane = pane.s.index;
                            }
                            // Then if another pane is found with a selection then set filterPane to null to
                            //  show that multiple panes have selections present
                            else if (selectLength > 0) {
                                filterPane = null;
                            }
                        }
                    }
                }
                let deselectIdx;
                let newSelectionList = [];
                // Don't run this if it is due to the panes regenerating
                if (!this.regenerating) {
                    for (let pane of this.s.panes) {
                        // Identify the pane where a selection or deselection has been made and add it to the list.
                        if (pane.s.selectPresent) {
                            this.s.selectionList.push({ index: pane.s.index, rows: pane.s.dtPane.rows({ selected: true }).data().toArray(), protect: false });
                            table.state.save();
                            break;
                        }
                        else if (pane.s.deselect) {
                            deselectIdx = pane.s.index;
                            let selectedData = pane.s.dtPane.rows({ selected: true }).data().toArray();
                            if (selectedData.length > 0) {
                                this.s.selectionList.push({ index: pane.s.index, rows: selectedData, protect: true });
                            }
                        }
                    }
                    if (this.s.selectionList.length > 0) {
                        let last = this.s.selectionList[this.s.selectionList.length - 1].index;
                        for (let pane of this.s.panes) {
                            pane.s.lastSelect = (pane.s.index === last);
                        }
                    }
                    // Remove selections from the list from the pane where a deselect has taken place
                    for (let i = 0; i < this.s.selectionList.length; i++) {
                        if (this.s.selectionList[i].index !== deselectIdx || this.s.selectionList[i].protect === true) {
                            let further = false;
                            // Find out if this selection is the last one in the list for that pane
                            for (let j = i + 1; j < this.s.selectionList.length; j++) {
                                if (this.s.selectionList[j].index === this.s.selectionList[i].index) {
                                    further = true;
                                }
                            }
                            // If there are no selections for this pane in the list then just push this one
                            if (!further) {
                                newSelectionList.push(this.s.selectionList[i]);
                                this.s.selectionList[i].protect = false;
                            }
                        }
                    }
                    // Update all of the panes to reflect the current state of the filters
                    for (let pane of this.s.panes) {
                        if (pane.s.dtPane !== undefined) {
                            let tempFilter = true;
                            pane.s.filteringActive = true;
                            if ((filterPane !== -1 && filterPane !== null && filterPane === pane.s.index) || filterActive === false) {
                                tempFilter = false;
                                pane.s.filteringActive = false;
                            }
                            pane.updatePane(!tempFilter ? false : filterActive);
                        }
                    }
                    // Update the label that shows how many filters are in place
                    this._updateFilterCount();
                    // If the length of the selections are different then some of them have been removed and a deselect has occured
                    if (newSelectionList.length > 0 && (newSelectionList.length < this.s.selectionList.length || rebuild)) {
                        this._cascadeRegen(newSelectionList);
                        let last = newSelectionList[newSelectionList.length - 1].index;
                        for (let pane of this.s.panes) {
                            pane.s.lastSelect = (pane.s.index === last);
                        }
                    }
                    else if (newSelectionList.length > 0) {
                        // Update all of the other panes as you would just making a normal selection
                        for (let paneUpdate of this.s.panes) {
                            if (paneUpdate.s.dtPane !== undefined) {
                                let tempFilter = true;
                                paneUpdate.s.filteringActive = true;
                                if ((filterPane !== -1 && filterPane !== null && filterPane === paneUpdate.s.index) || filterActive === false) {
                                    tempFilter = false;
                                    paneUpdate.s.filteringActive = false;
                                }
                                paneUpdate.updatePane(!tempFilter ? tempFilter : filterActive);
                            }
                        }
                    }
                }
                else {
                    for (let pane of this.s.panes) {
                        if (pane.s.dtPane !== undefined) {
                            let tempFilter = true;
                            pane.s.filteringActive = true;
                            if ((filterPane !== -1 && filterPane !== null && filterPane === pane.s.index) || filterActive === false) {
                                tempFilter = false;
                                pane.s.filteringActive = false;
                            }
                            pane.updatePane(!tempFilter ? tempFilter : filterActive);
                        }
                    }
                    // Update the label that shows how many filters are in place
                    this._updateFilterCount();
                }
                if (!filterActive) {
                    this.s.selectionList = [];
                }
            }
        }
        /**
         * Attach the panes, buttons and title to the document
         */
        _attach() {
            $$1(this.dom.container).removeClass(this.classes.hide);
            $$1(this.dom.titleRow).removeClass(this.classes.hide);
            $$1(this.dom.titleRow).remove();
            $$1(this.dom.title).appendTo(this.dom.titleRow);
            // If the clear button is permitted attach it
            if (this.c.clear) {
                $$1(this.dom.clearAll).appendTo(this.dom.titleRow);
                $$1(this.dom.clearAll).on('click.dtsps', () => {
                    this.clearSelections();
                });
            }
            $$1(this.dom.titleRow).appendTo(this.dom.container);
            // Attach the container for each individual pane to the overall container
            for (let pane of this.s.panes) {
                $$1(pane.dom.container).appendTo(this.dom.panes);
            }
            // Attach everything to the document
            $$1(this.dom.panes).appendTo(this.dom.container);
            if ($$1('div.' + this.classes.container).length === 0) {
                $$1(this.dom.container).prependTo(this.s.dt);
            }
            return this.dom.container;
        }
        /**
         * Attach the top row containing the filter count and clear all button
         */
        _attachExtras() {
            $$1(this.dom.container).removeClass(this.classes.hide);
            $$1(this.dom.titleRow).removeClass(this.classes.hide);
            $$1(this.dom.titleRow).remove();
            $$1(this.dom.title).appendTo(this.dom.titleRow);
            // If the clear button is permitted attach it
            if (this.c.clear) {
                $$1(this.dom.clearAll).appendTo(this.dom.titleRow);
            }
            $$1(this.dom.titleRow).appendTo(this.dom.container);
            return this.dom.container;
        }
        /**
         * If there are no panes to display then this method is called to either
         *   display a message in their place or hide them completely.
         */
        _attachMessage() {
            // Create a message to display on the screen
            let message;
            try {
                message = this.s.dt.i18n('searchPanes.emptyPanes', 'No SearchPanes');
            }
            catch (error) {
                message = null;
            }
            // If the message is an empty string then searchPanes.emptyPanes is undefined,
            //  therefore the pane container should be removed from the display
            if (message === null) {
                $$1(this.dom.container).addClass(this.classes.hide);
                $$1(this.dom.titleRow).removeClass(this.classes.hide);
                return;
            }
            else {
                $$1(this.dom.container).removeClass(this.classes.hide);
                $$1(this.dom.titleRow).addClass(this.classes.hide);
            }
            // Otherwise display the message
            $$1(this.dom.emptyMessage).text(message);
            this.dom.emptyMessage.appendTo(this.dom.container);
            return this.dom.container;
        }
        /**
         * Attaches the panes to the document and displays a message or hides if there are none
         */
        _attachPaneContainer() {
            // If a pane is to be displayed then attach the normal pane output
            for (let pane of this.s.panes) {
                if (pane.s.displayed === true) {
                    return this._attach();
                }
            }
            // Otherwise attach the custom message or remove the container from the display
            return this._attachMessage();
        }
        /**
         * Prepares the panes for selections to be made when cascade is active and a deselect has occured
         * @param newSelectionList the list of selections which are to be made
         */
        _cascadeRegen(newSelectionList) {
            // Set this to true so that the actions taken do not cause this to run until it is finished
            this.regenerating = true;
            // If only one pane has been selected then take note of its index
            let solePane = -1;
            if (newSelectionList.length === 1) {
                solePane = newSelectionList[0].index;
            }
            // Let the pane know that a cascadeRegen is taking place to avoid unexpected behaviour
            //  and clear all of the previous selections in the pane
            for (let pane of this.s.panes) {
                pane.setCascadeRegen(true);
                pane.setClear(true);
                // If this is the same as the pane with the only selection then pass it as a parameter into clearPane
                if ((pane.s.dtPane !== undefined && pane.s.index === solePane) || pane.s.dtPane !== undefined) {
                    pane.clearPane();
                }
                pane.setClear(false);
            }
            // Remake Selections
            this._makeCascadeSelections(newSelectionList);
            // Set the selection list property to be the list without the selections from the deselect pane
            this.s.selectionList = newSelectionList;
            // The regeneration of selections is over so set it back to false
            for (let pane of this.s.panes) {
                pane.setCascadeRegen(false);
            }
            this.regenerating = false;
        }
        /**
         * Attaches the message to the document but does not add any panes
         */
        _checkMessage() {
            // If a pane is to be displayed then attach the normal pane output
            for (let pane of this.s.panes) {
                if (pane.s.displayed === true) {
                    return;
                }
            }
            // Otherwise attach the custom message or remove the container from the display
            return this._attachMessage();
        }
        /**
         * Gets the selection list from the previous state and stores it in the selectionList Property
         */
        _getState() {
            let loadedFilter = this.s.dt.state.loaded();
            if (loadedFilter && loadedFilter.searchPanes && loadedFilter.searchPanes.selectionList !== undefined) {
                this.s.selectionList = loadedFilter.searchPanes.selectionList;
            }
        }
        /**
         * Makes all of the selections when cascade is active
         * @param newSelectionList the list of selections to be made, in the order they were originally selected
         */
        _makeCascadeSelections(newSelectionList) {
            // make selections in the order they were made previously, excluding those from the pane where a deselect was made
            for (let selection of newSelectionList) {
                // As the selections may have been made across the panes in a different order to the pane index we must identify
                //  which pane has the index of the selection. This is also important for colreorder etc
                for (let pane of this.s.panes) {
                    if (pane.s.index === selection.index && pane.s.dtPane !== undefined) {
                        // if there are any selections currently in the pane then deselect them as we are about to make our new selections
                        if (pane.s.dtPane.rows({ selected: true }).data().toArray().length > 0 && pane.s.dtPane !== undefined) {
                            pane.setClear(true);
                            pane.clearPane();
                            pane.setClear(false);
                        }
                        // select every row in the pane that was selected previously
                        for (let row of selection.rows) {
                            pane.s.dtPane.rows().every((rowIdx) => {
                                if (pane.s.dtPane.row(rowIdx).data() !== undefined &&
                                    row !== undefined &&
                                    pane.s.dtPane.row(rowIdx).data().filter === row.filter) {
                                    pane.s.dtPane.row(rowIdx).select();
                                }
                            });
                        }
                        // Update the label that shows how many filters are in place
                        this._updateFilterCount();
                    }
                }
            }
            // Make sure that the state is saved after all of these selections
            this.s.dt.state.save();
        }
        /**
         * Declares the instances of individual searchpanes dependant on the number of columns.
         * It is necessary to run this once preInit has completed otherwise no panes will be
         *  created as the column count will be 0.
         * @param table the DataTable api for the parent table
         * @param paneSettings the settings passed into the constructor
         * @param opts the options passed into the constructor
         */
        _paneDeclare(table, paneSettings, opts) {
            // Create Panes
            table
                .columns(this.c.columns.length > 0 ? this.c.columns : undefined)
                .eq(0)
                .each((idx) => {
                this.s.panes.push(new SearchPane(paneSettings, opts, idx, this.c.layout, this.dom.panes));
            });
            // If there is any extra custom panes defined then create panes for them too
            let rowLength = table.columns().eq(0).toArray().length;
            let paneLength = this.c.panes.length;
            for (let i = 0; i < paneLength; i++) {
                let id = rowLength + i;
                this.s.panes.push(new SearchPane(paneSettings, opts, id, this.c.layout, this.dom.panes, this.c.panes[i]));
            }
            // If a custom ordering is being used
            if (this.c.order.length > 0) {
                // Make a new Array of panes based upon the order
                let newPanes = this.c.order.map((name, index, values) => {
                    return this._findPane(name);
                });
                // Remove the old panes from the dom
                this.dom.panes.empty();
                this.s.panes = newPanes;
                // Append the panes in the correct order
                for (let pane of this.s.panes) {
                    this.dom.panes.append(pane.dom.container);
                }
            }
            // If this internal property is true then the DataTable has been initialised already
            if (this.s.dt.settings()[0]._bInitComplete) {
                this._paneStartup(table);
            }
            else {
                // Otherwise add the paneStartup function to the list of functions that are to be run when the table is initialised
                // This will garauntee that the panes are initialised before the init event and init Complete callback is fired
                this.s.dt.settings()[0].aoInitComplete.push({ fn: () => {
                        this._paneStartup(table);
                    } });
            }
        }
        /**
         * Finds a pane based upon the name of that pane
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
         * Runs the start up functions for the panes to enable listeners and populate panes
         * @param table the DataTable api for the parent Table
         */
        _paneStartup(table) {
            // Magic number of 500 is a guess at what will be fast
            if (this.s.dt.page.info().recordsTotal <= 500) {
                this._startup(table);
            }
            else {
                setTimeout(() => {
                    this._startup(table);
                }, 100);
            }
        }
        /**
         * Works out which panes to update when data is recieved from the server and viewTotal is active
         */
        _serverTotals() {
            let selectPresent = false;
            let deselectPresent = false;
            let table = this.s.dt;
            for (let pane of this.s.panes) {
                // Identify the pane where a selection or deselection has been made and add it to the list.
                if (pane.s.selectPresent) {
                    this.s.selectionList.push({ index: pane.s.index, rows: pane.s.dtPane.rows({ selected: true }).data().toArray(), protect: false });
                    table.state.save();
                    pane.s.selectPresent = false;
                    selectPresent = true;
                    break;
                }
                else if (pane.s.deselect) {
                    let selectedData = pane.s.dtPane.rows({ selected: true }).data().toArray();
                    if (selectedData.length > 0) {
                        this.s.selectionList.push({ index: pane.s.index, rows: selectedData, protect: true });
                    }
                    selectPresent = true;
                    deselectPresent = true;
                }
            }
            // Build an updated list based on any selections or deselections added
            if (!selectPresent) {
                this.s.selectionList = [];
            }
            else {
                let newSelectionList = [];
                for (let i = 0; i < this.s.selectionList.length; i++) {
                    let further = false;
                    // Find out if this selection is the last one in the list for that pane
                    for (let j = i + 1; j < this.s.selectionList.length; j++) {
                        if (this.s.selectionList[j].index === this.s.selectionList[i].index) {
                            further = true;
                        }
                    }
                    // If there are no selections for this pane in the list then just push this one
                    if (!further &&
                        this.s.panes[this.s.selectionList[i].index].s.dtPane.rows({ selected: true }).data().toArray().length > 0) {
                        newSelectionList.push(this.s.selectionList[i]);
                    }
                }
                this.s.selectionList = newSelectionList;
            }
            let initIdx = -1;
            // If there has been a deselect and only one pane has a selection then update everything
            if (deselectPresent && this.s.selectionList.length === 1) {
                for (let pane of this.s.panes) {
                    pane.s.lastSelect = false;
                    pane.s.deselect = false;
                    if (pane.s.dtPane !== undefined && pane.s.dtPane.rows({ selected: true }).data().toArray().length > 0) {
                        initIdx = pane.s.index;
                    }
                }
            }
            // Otherwise if there are more 1 selections then find the last one and set it to not update that pane
            else if (this.s.selectionList.length > 0) {
                let last = this.s.selectionList[this.s.selectionList.length - 1].index;
                for (let pane of this.s.panes) {
                    pane.s.lastSelect = (pane.s.index === last);
                    pane.s.deselect = false;
                }
            }
            // Otherwise if there are no selections then find where that took place and do not update to maintain scrolling
            else if (this.s.selectionList.length === 0) {
                for (let pane of this.s.panes) {
                    // pane.s.lastSelect = (pane.s.deselect === true);
                    pane.s.lastSelect = false;
                    pane.s.deselect = false;
                }
            }
            $$1(this.dom.panes).empty();
            // Rebuild the desired panes
            for (let pane of this.s.panes) {
                if (!pane.s.lastSelect) {
                    pane.rebuildPane(undefined, this.s.dt.page.info().serverSide ? this.s.serverData : undefined, pane.s.index === initIdx ? true : null);
                }
                else {
                    pane._setListeners();
                }
                // append all of the panes and enable select
                $$1(this.dom.panes).append(pane.dom.container);
                $$1.fn.dataTable.select.init(pane.s.dtPane);
            }
        }
        /**
         * Initialises the tables previous/preset selections and initialises callbacks for events
         * @param table the parent table for which the searchPanes are being created
         */
        _startup(table) {
            $$1(this.dom.container).text('');
            // Attach clear button and title bar to the document
            this._attachExtras();
            $$1(this.dom.container).append(this.dom.panes);
            $$1(this.dom.panes).empty();
            for (let pane of this.s.panes) {
                pane.rebuildPane(undefined, this.s.dt.page.info().serverSide ? this.s.serverData : undefined);
                $$1(this.dom.panes).append(pane.dom.container);
            }
            this._updateFilterCount();
            this._checkMessage();
            // When a draw is called on the DataTable, update all of the panes incase the data in the DataTable has changed
            table.on('draw.dtsps', () => {
                this._updateFilterCount();
                if ((this.c.cascadePanes || this.c.viewTotal) && !this.s.dt.page.info().serverSide) {
                    this.redrawPanes();
                }
                else {
                    this._updateSelection();
                }
                this.s.filterPane = -1;
            });
            // Whenever a state save occurs store the selection list in the state object
            this.s.dt.on('stateSaveParams.dtsp', (e, settings, data) => {
                if (data.searchPanes === undefined) {
                    data.searchPanes = {};
                }
                data.searchPanes.selectionList = this.s.selectionList;
            });
            // If the data is reloaded from the server then it is possible that it has changed completely,
            // so we need to rebuild the panes
            this.s.dt.on('xhr', () => {
                let processing = false;
                if (!this.s.dt.page.info().serverSide) {
                    this.s.dt.one('draw', () => {
                        if (processing) {
                            return;
                        }
                        processing = true;
                        $$1(this.dom.panes).empty();
                        for (let pane of this.s.panes) {
                            pane.clearData(); // Clears all of the bins and will mean that the data has to be re-read
                            // Pass a boolean to say whether this is the last choice made for maintaining selections when rebuilding
                            pane.rebuildPane(this.s.selectionList[this.s.selectionList.length - 1] !== undefined ?
                                pane.s.index === this.s.selectionList[this.s.selectionList.length - 1].index :
                                false);
                            $$1(this.dom.panes).append(pane.dom.container);
                        }
                        if (this.c.cascadePanes || this.c.viewTotal) {
                            this.redrawPanes();
                        }
                        else {
                            this._updateSelection();
                        }
                        this._checkMessage();
                    });
                }
            });
            if (this.s.selectionList !== undefined && this.s.selectionList.length > 0) {
                let last = this.s.selectionList[this.s.selectionList.length - 1].index;
                for (let pane of this.s.panes) {
                    pane.s.lastSelect = (pane.s.index === last);
                }
            }
            // If cascadePanes is active then make the previous selections in the order they were previously
            if (this.s.selectionList.length > 0 && this.c.cascadePanes) {
                this._cascadeRegen(this.s.selectionList);
            }
            // PreSelect any selections which have been defined using the preSelect option
            table
                .columns(this.c.columns.length > 0 ? this.c.columns : undefined)
                .eq(0)
                .each((idx) => {
                if (this.s.panes[idx] !== undefined &&
                    this.s.panes[idx].s.dtPane !== undefined &&
                    this.s.panes[idx].s.colOpts.preSelect !== undefined) {
                    let tableLength = this.s.panes[idx].s.dtPane.rows().data().toArray().length;
                    for (let i = 0; i < tableLength; i++) {
                        if (this.s.panes[idx].s.colOpts.preSelect.indexOf(this.s.panes[idx].s.dtPane.cell(i, 0).data()) !== -1) {
                            this.s.panes[idx].s.dtPane.row(i).select();
                            this.s.panes[idx].updateTable();
                        }
                    }
                }
            });
            // Update the title bar to show how many filters have been selected
            this._updateFilterCount();
            // If the table is destroyed and restarted then clear the selections so that they do not persist.
            table.on('destroy.dtsps', () => {
                for (let pane of this.s.panes) {
                    pane.destroy();
                }
                table.off('.dtsps');
                $$1(this.dom.clearAll).off('.dtsps');
                $$1(this.dom.container).remove();
                this.clearSelections();
            });
            // When the clear All button has been pressed clear all of the selections in the panes
            if (this.c.clear) {
                $$1(this.dom.clearAll).on('click.dtsps', () => {
                    this.clearSelections();
                });
            }
            if (this.s.dt.page.info().serverSide) {
                table.on('preXhr.dt', (e, settings, data) => {
                    if (data.searchPanes === undefined) {
                        data.searchPanes = {};
                    }
                    for (let pane of this.s.panes) {
                        let src = this.s.dt.column(pane.s.index).dataSrc();
                        if (data.searchPanes[src] === undefined) {
                            data.searchPanes[src] = [];
                        }
                        if (pane.s.dtPane !== undefined) {
                            let rowData = pane.s.dtPane.rows({ selected: true }).data().toArray();
                            for (let dataPoint of rowData) {
                                data.searchPanes[src].push(dataPoint.display);
                            }
                        }
                    }
                    if (this.c.viewTotal) {
                        this._prepViewTotal();
                    }
                });
            }
            table.settings()[0]._searchPanes = this;
        }
        _prepViewTotal() {
            let filterPane = this.s.filterPane;
            let filterActive = false;
            for (let pane of this.s.panes) {
                if (pane.s.dtPane !== undefined) {
                    let selectLength = pane.s.dtPane.rows({ selected: true }).data().toArray().length;
                    // If filterPane === -1 then a pane with a selection has not been found yet, so set filterPane to that panes index
                    if (selectLength > 0 && filterPane === -1) {
                        filterPane = pane.s.index;
                        filterActive = true;
                    }
                    // Then if another pane is found with a selection then set filterPane to null to
                    //  show that multiple panes have selections present
                    else if (selectLength > 0) {
                        filterPane = null;
                    }
                }
            }
            // Update all of the panes to reflect the current state of the filters
            for (let pane of this.s.panes) {
                if (pane.s.dtPane !== undefined) {
                    pane.s.filteringActive = true;
                    if ((filterPane !== -1 && filterPane !== null && filterPane === pane.s.index) || filterActive === false) {
                        pane.s.filteringActive = false;
                    }
                }
            }
        }
        /**
         * Updates the number of filters that have been applied in the title
         */
        _updateFilterCount() {
            let filterCount = 0;
            // Add the number of all of the filters throughout the panes
            for (let pane of this.s.panes) {
                if (pane.s.dtPane !== undefined) {
                    filterCount += pane.getPaneCount();
                }
            }
            // Run the message through the internationalisation method to improve readability
            let message = this.s.dt.i18n('searchPanes.title', 'Filters Active - %d', filterCount);
            $$1(this.dom.title).text(message);
            if (this.c.filterChanged !== undefined && typeof this.c.filterChanged === 'function') {
                this.c.filterChanged(filterCount);
            }
        }
        /**
         * Updates the selectionList when cascade is not in place
         */
        _updateSelection() {
            this.s.selectionList = [];
            for (let pane of this.s.panes) {
                if (pane.s.dtPane !== undefined) {
                    this.s.selectionList.push({ index: pane.s.index, rows: pane.s.dtPane.rows({ selected: true }).data().toArray(), protect: false });
                }
            }
            this.s.dt.state.save();
        }
    }
    SearchPanes.version = '1.0.1';
    SearchPanes.classes = {
        clear: 'dtsp-clear',
        clearAll: 'dtsp-clearAll',
        container: 'dtsp-searchPanes',
        emptyMessage: 'dtsp-emptyMessage',
        hide: 'dtsp-hidden',
        panes: 'dtsp-panesContainer',
        search: 'dtsp-search',
        title: 'dtsp-title',
        titleRow: 'dtsp-titleRow'
    };
    // Define SearchPanes default options
    SearchPanes.defaults = {
        cascadePanes: false,
        clear: true,
        container(dt) {
            return dt.table().container();
        },
        columns: [],
        filterChanged: undefined,
        layout: 'columns-3',
        order: [],
        panes: [],
        viewTotal: false,
    };

    /*! SearchPanes 1.0.1
     * 2019-2020 SpryMedia Ltd - datatables.net/license
     */
    // DataTables extensions common UMD. Note that this allows for AMD, CommonJS
    // (with window and jQuery being allowed as parameters to the returned
    // function) or just default browser loading.
    (function (factory) {
        if (typeof define === 'function' && define.amd) {
            // AMD
            define(['jquery', 'datatables.net'], function ($) {
                return factory($, window, document);
            });
        }
        else if (typeof exports === 'object') {
            // CommonJS
            module.exports = function (root, $) {
                if (!root) {
                    root = window;
                }
                if (!$ || !$.fn.dataTable) {
                    $ = require('datatables.net')(root, $).$;
                }
                return factory($, root, root.document);
            };
        }
        else {
            // Browser - assume jQuery has already been loaded
            factory(window.jQuery, window, document);
        }
    }(function ($, window, document) {
        setJQuery($);
        setJQuery$1($);
        let DataTable = $.fn.dataTable;
        $.fn.dataTable.SearchPanes = SearchPanes;
        $.fn.DataTable.SearchPanes = SearchPanes;
        $.fn.dataTable.SearchPane = SearchPane;
        $.fn.DataTable.SearchPane = SearchPane;
        DataTable.Api.register('searchPanes.rebuild()', function () {
            return this.iterator('table', function () {
                if (this.searchPanes) {
                    this.searchPanes.rebuild();
                }
            });
        });
        DataTable.Api.register('column().paneOptions()', function (options) {
            return this.iterator('column', function (idx) {
                let col = this.aoColumns[idx];
                if (!col.searchPanes) {
                    col.searchPanes = {};
                }
                col.searchPanes.values = options;
                if (this.searchPanes) {
                    this.searchPanes.rebuild();
                }
            });
        });
        let apiRegister = $.fn.dataTable.Api.register;
        apiRegister('searchPanes()', function () {
            return this;
        });
        apiRegister('searchPanes.clearSelections()', function () {
            let ctx = this.context[0];
            ctx._searchPanes.clearSelections();
            return this;
        });
        apiRegister('searchPanes.rebuildPane()', function (targetIdx, maintainSelections) {
            let ctx = this.context[0];
            ctx._searchPanes.rebuild(targetIdx, maintainSelections);
            return this;
        });
        apiRegister('searchPanes.container()', function () {
            let ctx = this.context[0];
            return ctx._searchPanes.getNode();
        });
        $.fn.dataTable.ext.buttons.searchPanesClear = {
            text: 'Clear Panes',
            action(e, dt, node, config) {
                dt.searchPanes.clearSelections();
            }
        };
        $.fn.dataTable.ext.buttons.searchPanes = {
            action(e, dt, node, config) {
                e.stopPropagation();
                this.popover(config._panes.getNode(), {
                    align: 'dt-container'
                });
            },
            config: {},
            init(dt, node, config) {
                let panes = new $.fn.dataTable.SearchPanes(dt, $.extend({
                    filterChanged(count) {
                        dt.button(node).text(dt.i18n('searchPanes.collapse', { 0: 'SearchPanes', _: 'SearchPanes (%d)' }, count));
                    }
                }, config.config));
                let message = dt.i18n('searchPanes.collapse', 'SearchPanes', 0);
                dt.button(node).text(message);
                config._panes = panes;
            },
            text: 'Search Panes',
        };
        function _init(settings, fromPre = false) {
            let api = new DataTable.Api(settings);
            let opts = api.init().searchPanes || DataTable.defaults.searchPanes;
            let searchPanes = new SearchPanes(api, opts, fromPre);
            let node = searchPanes.getNode();
            return node;
        }
        // Attach a listener to the document which listens for DataTables initialisation
        // events so we can automatically initialise
        $(document).on('preInit.dt.dtsp', function (e, settings, json) {
            if (e.namespace !== 'dt') {
                return;
            }
            if (settings.oInit.searchPanes ||
                DataTable.defaults.searchPanes) {
                if (!settings._searchPanes) {
                    _init(settings, true);
                }
            }
        });
        // DataTables `dom` feature option
        DataTable.ext.feature.push({
            cFeature: 'P',
            fnInit: _init,
        });
        // DataTables 2 layout feature
        if (DataTable.ext.features) {
            DataTable.ext.features.register('searchPanes', _init);
        }
    }));

}());
