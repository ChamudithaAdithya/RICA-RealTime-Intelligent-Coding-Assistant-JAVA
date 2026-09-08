package com.example.structural.application;

public class MongoOrderFactory {
    // V312 fragmented factory family
    // RICA-V312 FIX:
    // Group related SQL/Mongo creation variants behind an abstract factory.
    // The caller should choose a family once, then request compatible products.
    // Example fixed shape:
    //   PersistenceFactory factory = factoryProvider.forStore("mongo");
    //   return factory.createOrderRepository();
    public SqlOrderFactory.Order create() {
        return new SqlOrderFactory.Order();
    }
}
