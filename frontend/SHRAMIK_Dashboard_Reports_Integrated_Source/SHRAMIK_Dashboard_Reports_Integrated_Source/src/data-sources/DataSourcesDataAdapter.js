export class DataSourcesAdapterError extends Error {
    detail;
    constructor(detail) {
        super(detail.message);
        this.detail = detail;
        this.name = 'DataSourcesAdapterError';
    }
}
