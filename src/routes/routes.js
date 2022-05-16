import { Router } from "express";
require("dotenv").config();
const api = Router();

const neo4j = require("neo4j-driver");

const { url, db_username, db_password, database } = process.env;
const driver = neo4j.driver(url, neo4j.auth.basic(db_username, db_password), {
  disableLosslessIntegers: true,
});

//GET ALL USERS
api.get("/users", async (req, response) => {
  const session = driver.session({ database });

  session
    .run(
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
    )
    .then((result) => {
      response.json(result.records.map((u) => u.get("User")));
    })
    .catch((error) => {
      response.status(500).send({
        success: false,
        message: error.message,
      });
    })
    .finally(() => {
      session.close();
    });
});

//GET USER BY ID
api.get("/users/:id", async (req, response) => {
  const session = driver.session({ database });

  session
    .run(
      `MATCH 
        (u:User) -[r]-> (n)
        WHERE
        id(u) = ${req.params.id}
        RETURN 
        u, r, n`
    )
    .then((result) => {
      const user = result.records[0].get("u").properties;
      const nodes = result.records.map((u) => u.get("n"));
      const relation = result.records.map((u) => u.get("r"));

      response.json({ user, relation, nodes });
    })
    .catch((error) => {
      response.status(500).send({
        success: false,
        message: error.message,
      });
    })
    .finally(() => {
      session.close();
    });
});

//FIND SIMILAR PARTNERS FOR GIVEN USER BY THEIR ID
api.get("/partners/user/:id", async (req, response) => {
  const session = driver.session({ database });

  session
    .run(
      ` MATCH
            (HOBBY :Hobby) <-[:LIKE]- (SEEKING_USER :User)-[:LIVE_IN]->(CITY)
        WHERE 
            id(SEEKING_USER) = ${req.params.id}
        WITH 
            SEEKING_USER, 
            CITY, 
            collect(id(HOBBY)) AS SEEKING_USER_HOBBY_IDS
        
        MATCH 
            (WANTED_USERS_HOBBY :Hobby) <-[:LIKE]- (WANTED_USERS :User) -[:LIVE_IN]->(CITY)
        WHERE 
            WANTED_USERS.age < SEEKING_USER.age+5 OR WANTED_USERS.age > SEEKING_USER.age-5
        WITH 
            SEEKING_USER, 
            SEEKING_USER_HOBBY_IDS, 
            WANTED_USERS, 
            collect(id(WANTED_USERS_HOBBY)) AS WANTED_USERS_HOBBY_IDS
        WITH 
            WANTED_USERS,
            id(WANTED_USERS) as WANTED_USERS_IDS, 
            SEEKING_USER,
            [id in SEEKING_USER_HOBBY_IDS WHERE id in WANTED_USERS_HOBBY_IDS] as COMMON_HOBBIES_IDS, 
            gds.similarity.overlap(SEEKING_USER_HOBBY_IDS, WANTED_USERS_HOBBY_IDS)*100 AS SIMILARITY
        ORDER BY 
            SIMILARITY DESC
        WHERE
            SIMILARITY > 50 AND SEEKING_USER.sex <> WANTED_USERS.sex
        WITH
            {
                POSSIBLE_FRIEND_ID: WANTED_USERS_IDS,
                COMMON_HOBBIES_IDS: COMMON_HOBBIES_IDS,
                SIMILARITY: SIMILARITY
            } AS Result
        RETURN 
            Result
    `
    )
    .then((result) => {
      response.json(result.records.map((r) => r.get("Result")));
    })
    .catch((error) => {
      response.status(500).send({
        success: false,
        message: error.message,
      });
    })
    .finally(() => {
      session.close();
    });
});

//FIND SIMILARS PAIRS FOR GIVEN PAIR BY USER ID
api.get("/partners/pair/:id", async (req, response) => {
  const session = driver.session({ database });

  session
    .run(
      ` MATCH 
            (HOBBY_1 :Hobby) <-[:LIKE]- (USER_1 :User) -[:IN_RELATIONSHIP]-> (RELATION) <-[:IN_RELATIONSHIP]- (:User) -[:LIKE]-> (HOBBY_2 :Hobby)
        WHERE 
            id(USER_1) = ${req.params.id}
        WITH 
            collect(HOBBY_1)+collect(HOBBY_2) as HOBBIES_RAW, 
            RELATION
        UNWIND 
            HOBBIES_RAW as COMMON_HOBBIES_RAW
        WITH 
            distinct(id(COMMON_HOBBIES_RAW)) as COMMON_HOBBIES_IDS, RELATION
        MATCH 
            (HOBBY_3 :Hobby) <-[:LIKE]- (:User) -[:IN_RELATIONSHIP]-> (RELATION_2) <-[:IN_RELATIONSHIP]- (:User) -[:LIKE]-> (HOBBY_4 :Hobby)
        WHERE 
            RELATION <> RELATION_2
        WITH 
            collect(HOBBY_3)+collect(HOBBY_4) as HOBBIES_RAW, 
            RELATION_2, 
            RELATION, 
            COMMON_HOBBIES_IDS
        UNWIND 
            HOBBIES_RAW as COMMON_HOBBIES_RAW
        WITH
            RELATION,
            RELATION_2,
            collect(distinct COMMON_HOBBIES_IDS) as SEEKING_COUPLE_HOBBY_IDS,
            collect(distinct id(COMMON_HOBBIES_RAW)) as WANTED_COUPLE_HOBBY_IDS
        WITH 
            id(RELATION_2) as WANTED_COUPLE_ID, 
            [id in WANTED_COUPLE_HOBBY_IDS WHERE id in SEEKING_COUPLE_HOBBY_IDS] as COMMON_HOBBIES_IDS,
            gds.similarity.overlap(SEEKING_COUPLE_HOBBY_IDS, WANTED_COUPLE_HOBBY_IDS)*100 AS SIMILARITY_LEVEL
        ORDER BY
            SIMILARITY_LEVEL DESC
        WITH {
            WANTED_COUPLE_ID: WANTED_COUPLE_ID,
            COMMON_HOBBIES_IDS: COMMON_HOBBIES_IDS,
            SIMILARITY_LEVEL: SIMILARITY_LEVEL
            } as Result
        RETURN
            Result
        
      `
    )
    .then((result) => {
      response.json(result.records.map((r) => r.get("Result")));
    })
    .catch((error) => {
      response.status(500).send({
        success: false,
        message: error.message,
      });
    })
    .finally(() => {
      session.close();
    });
});

//SHOW MOST POPULAR HOBBIES
api.get("/hobbies", async (req, response) => {
  const session = driver.session({ database });

  session
    .run(
      ` CALL 
            gds.degree.stream('hobbies')
        YIELD 
            nodeId, 
            score
        WITH 
            id(gds.util.asNode(nodeId)) AS HOBBY_ID, 
            gds.util.asNode(nodeId).name AS HOBBY,
            score AS FOLLOWERS
        ORDER BY 
            FOLLOWERS DESC
        WITH { 
            HOBBY_ID: HOBBY_ID,
            HOBBY: HOBBY, 
            FOLLOWERS: FOLLOWERS } as Result 
        RETURN 
            Result
        LIMIT 
            10;
      `
    )
    .then((result) => {
      response.json(result.records.map((r) => r.get("Result")));
    })
    .catch((error) => {
      response.status(500).send({
        success: false,
        message: error.message,
      });
    })
    .finally(() => {
      session.close();
    });
});

//SHOW ALL USERS FOR GIVEN HOBBY NAME
api.get("/hobbies/:name", async (req, response) => {
  const session = driver.session({ database });

  session
    .run(
      ` MATCH 
            (USER :User) -[:LIKE]-> (HOBBY :Hobby)
        WHERE 
            HOBBY.name = '${req.params.name}'
        WITH { 
            id: id(USER),
            name: USER.name,
            age: USER.age,
            sex: USER.sex } as Result 
        RETURN
            Result
      `
    )
    .then((result) => {
      response.json(result.records.map((r) => r.get("Result")));
    })
    .catch((error) => {
      response.status(500).send({
        success: false,
        message: error.message,
      });
    })
    .finally(() => {
      session.close();
    });
});

api.post("/friends/:us1&:us2", async (req, response) => {
  const session = driver.session({ database });

  session
    .run(
      ` MATCH 
            (USER_1 :User),
            (USER_2 :User)
        WHERE 
            id(USER_1) = ${req.params.us1} AND id(USER_2) = ${req.params.us2}
        MERGE 
            (USER_1) -[r :FRIEND_TO]-> (USER_2)
        WITH
        {
            USER_1: {
                id: id(USER_1),
                name: USER_1.name,
                age: USER_1.age,
                sex: USER_1.sex
            },
            RELATION: type(r),
            USER_2: {
                id: id(USER_2),
                name: USER_2.name,
                age: USER_2.age,
                sex: USER_2.sex
            }
        } as Result
        RETURN
            Result
      `
    )
    .then((result) => {
      response.json(result.records.map((r) => r.get("Result")));
    })
    .catch((error) => {
      response.status(500).send({
        success: false,
        message: error.message,
      });
    })
    .finally(() => {
      session.close();
    });
});

api.post("/relation/:us1&:us2", async (req, response) => {
  const session = driver.session({ database });

  session
    .run(
      ` OPTIONAL MATCH 
            (USER_1 :User)-[:IN_RELATIONSHIP]->(RELATION :Relationship)
        WHERE 
            id(USER_1) = ${req.params.us1} OR id(USER_1) = ${req.params.us2}
        CALL 
            apoc.do.when 
                (
                    RELATION IS null ,
                    '
                        MATCH
                            (USER_1 :User),
                            (USER_2 :User)
                        WHERE 
                            ID(USER_1) = ${req.params.us1} AND ID(USER_2) = ${req.params.us2}
                        CREATE 
                            (USER_1)-[:IN_RELATIONSHIP]->(r :Relationship)<-[:IN_RELATIONSHIP]-(USER_2)
                        RETURN r AS result
                    ',
                    'RETURN "One of given person is already in relationship!" AS result',
                    {}
                ) YIELD value
        RETURN 
            value
        `
    )
    .then((result) => {
      response.json(result.records.map((r) => r.get("value")));
    })
    .catch((error) => {
      response.status(500).send({
        success: false,
        message: error.message,
      });
    })
    .finally(() => {
      session.close();
    });
});

export default api;
