// Recursively cast numeric strings to actual numbers
function castNumericValues(obj) {
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === 'object' && val !== null) {
            castNumericValues(val);
        } else if (typeof val === 'string' && val !== '' && !isNaN(val)) {
            obj[key] = Number(val);
        }
    }
    return obj;
}

class QueryBuilder {
    constructor(model, queryString, baseFilter = {}) {
        this.model = model;
        this.queryString = queryString;
        this.baseFilter = baseFilter;
        this.query = model.find(baseFilter);
    }

    filter() {
        const queryObj = { ...this.queryString };
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        excludedFields.forEach((field) => delete queryObj[field]);

        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(
            /\b(gte|gt|lte|lt)\b/g,
            (match) => `$${match}`
        );

        const parsed = castNumericValues(JSON.parse(queryStr));
        this.query = this.query.find(parsed);
        return this;
    }

    sort() {
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            this.query = this.query.sort('-createdAt');
        }
        return this;
    }

    selectFields() {
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        } else {
            this.query = this.query.select('-__v');
        }
        return this;
    }

    paginate() {
        const page = parseInt(this.queryString.page, 10) || 1;
        const limit = parseInt(this.queryString.limit, 10) || 10;
        const skip = (page - 1) * limit;

        this.query = this.query.skip(skip).limit(limit);
        this.pagination = { page, limit };
        return this;
    }
}

export default QueryBuilder;