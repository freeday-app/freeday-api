const { PaginationError } = require('./errors.js');

// methods designed to be injected in mongoose that will paginate query results
const Paginator = {

    defaultLimit: 50,

    // injects pagination methods in mongoose schema statics
    setMethods(mongooseSchema) {
        Paginator.setPaginate(mongooseSchema);
        Paginator.setPaginateToResult(mongooseSchema);
        return mongooseSchema;
    },

    // executes mongoose query and return paginated documents with page object
    setPaginate(mongooseSchema) {
        // eslint-disable-next-line func-names
        mongooseSchema.statics.paginate = function (qPage, qLimit, find = {}, sort = {}) {
            // if all documents requested
            if (qPage && qPage === 'all') {
                return this.find(find)
                    .sort(sort)
                    .exec()
                    .then((documents) => ({
                        documents,
                        page: null
                    }));
            }
            // gets paging values
            let page = 1;
            if (qPage && !Number.isNaN(qPage)) {
                page = parseInt(qPage);
            }
            let limit = Paginator.defaultLimit;
            if (qLimit && !Number.isNaN(qLimit)) {
                limit = parseInt(qLimit);
            }
            const skip = (page - 1) * limit;
            // counts total docs in query
            let pages;
            return this.countDocuments(find).then((count) => {
                // controls page is in legit range
                pages = count > 0 ? Math.ceil(count / limit) : 1;
                if (page < 1 || page > pages) {
                    throw new PaginationError(`Invalid page (value: ${page})`);
                }
                // executes query
                return this.find(find)
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .exec();
            }).then((documents) => ({
                documents,
                page: {
                    current: page,
                    total: pages
                }
            }));
        };
    },

    // injects api list method
    // returns formatted result object
    // documents are converted to json
    setPaginateToResult(mongooseSchema) {
        mongooseSchema.statics.paginateToResult = (
            // eslint-disable-next-line func-names
            function (name, page, limit, find = {}, sort = {}) {
                return this.paginate(page, limit, find, sort).then((r) => {
                    const result = {
                        [name]: r.documents.map((d) => d.toJSON()),
                        total: r.documents.length
                    };
                    if (r.page) {
                        result.page = r.page;
                    }
                    return result;
                });
            }
        );
    }

};

module.exports = Paginator;
