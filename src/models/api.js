const neo4j = require("neo4j-driver");
require("dotenv").config();
const { url, db_username, db_password, database } = process.env;
const driver = neo4j.driver(url, neo4j.auth.basic(db_username, db_password), {
  disableLosslessIntegers: true,
});

const findAll = async () => {
  const session = driver.session({ database });

  try {
    const res = await session.run(
      `MATCH 
          (u :User)
          WITH 
          {
              id: id(u),
              name: u.name,
              age: u.age,
              sex: u.sex
            } as User
            RETURN 
            User`
    );

    return res.records.map((u) => u.get("User"));
  } catch (e) {
    return e;
  } finally {
    session.close();
  }
};

const findById = async (id) => {
  const session = driver.session({ database });

  try {
    const res = await session.run(
      `MATCH 
            (u:User) -[r]-> (n)
        WHERE
            id(u) = ${id}
        RETURN 
            u, r, n`
    );

    const user = res.records[0].get("u").properties;
    const nodes = res.records.map((u) => u.get("n"));
    const relation = res.records.map((u) => u.get("r"));

    return { user, relation, nodes };
  } catch (e) {
    return e;
  } finally {
    session.close();
  }
};
