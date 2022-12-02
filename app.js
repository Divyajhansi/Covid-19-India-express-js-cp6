const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();
module.exports = app;

//state db

const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

//district db

const convertDistrictDbObjectToResponseObject = (dbObject2) => {
  return {
    districtId: dbObject2.district_id,
    districtName: dbObject2.district_name,
    stateId: dbObject2.state_id,
    cases: dbObject2.cases,
    cured: dbObject2.cured,
    active: dbObject2.active,
    deaths: dbObject2.deaths,
  };
};

//get all states
app.get("/states/", async (request, response) => {
  const getAllStates = `
    SELECT * FROM state`;
  const statesList = await db.all(getAllStates);
  response.send(
    statesList.map((eachState) =>
      convertStateDbObjectToResponseObject(eachState)
    )
  );
});

//GET single state

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStatesList = `
    SELECT
      *
    FROM
      state
    WHERE
      state_id = '${stateId}';`;
  const state = await db.get(getStatesList);
  response.send(convertStateDbObjectToResponseObject(state));
});

//get states statistics

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatesStatQuery = `
    SELECT
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
    FROM
      district
    WHERE
      state_id='${stateId}';`;
  const statisticsArray = await db.get(getStatesStatQuery);
  response.send({
    totalCases: statisticsArray["SUM(cases)"],
    totalCured: statisticsArray["SUM(cured)"],
    totalActive: statisticsArray["SUM(active)"],
    totalDeaths: statisticsArray["SUM(deaths)"],
  });
});
//get state names

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateNameQuery = `
    SELECT
      state_name
    FROM
      district
    NATURAL JOIN
      state
    WHERE 
      district_id=${districtId};`;
  const state = await db.get(getStateNameQuery);
  response.send({ stateName: state.state_name });
});
//get single district

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictList = `
    SELECT
      *
    FROM
      district
    WHERE
      district_id = '${districtId}';`;
  const district = await db.get(getDistrictList);
  response.send(convertDistrictDbObjectToResponseObject(district));
});

//add new district into the list

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const addDistrictQuery = `
    INSERT INTO district
       (district_name, state_id, cases, cured, active, deaths)
       VALUES
      (
         '${districtName}',
          '${stateId}',
          '${cases}',
          '${cured}',
          '${active}',
          '${deaths}')`;

  const dbResponse = await db.run(addDistrictQuery);
  response.send("District Successfully Added");
});

//update districts list

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistrictQuery = `
  UPDATE
    district
  SET
    district_name = '${districtName}',
    state_id = '${stateId}',
    cases='${cases}',
    cured='${cured}',
    active='${active}',
    deaths='${deaths}'
  WHERE
    district_id = '${districtId}';`;

  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//delete districts from the list

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
  DELETE FROM
    district
  WHERE
    district_id = '${districtId}';`;
  const districtDel = await db.get(deleteDistrictQuery);
  response.send("District Removed");
});
