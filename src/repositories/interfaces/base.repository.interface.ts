export interface BaseRepositoryInterface<T, ID, CreateDTO, UpdateDTO> {
    create(data: CreateDTO): Promise<T>;
    findById(id: ID): Promise<T | null>;
    findAll(): Promise<T[]>;
    update(id: ID, data: UpdateDTO): Promise<T | null>;
    delete(id: ID): Promise<boolean>;
}