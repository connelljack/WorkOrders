const fetch = require('node-fetch');
const express = require('express');
const Datastore = require('nedb');
require('dotenv').config();

const app = express();
app.listen(3002,() => console.log("listening at 3002"));
app.use(express.static('public/'));
// Middleware to parse JSON request bodies
app.use(express.json());

//const authUrl = "https://app.247software.com/authenticate?username=tableautv@redsox.com&password=Redsox2024";

const workOrdersUrl =`https://app.247software.com/workOrders?data={"start":0,"limit":1000}`

const database = new Datastore('database.db');
database.loadDatabase();

const databaseEvents = new Datastore('databaseEvents.db');
databaseEvents.loadDatabase();
/*
const databaseC = new Datastore('databaseC.db');
databaseC.loadDatabase();

const databaseP = new Datastore('databaseP.db');
databaseP.loadDatabase();*/

// Function to fetch events
async function fetchEvents() {
    try {
        // Clear existing records in the database
        databaseEvents.remove({}, { multi: true }, function (err, numRemoved) {
            console.log(err);
            console.log(numRemoved);
        });

        databaseEvents.persistence.compactDatafile();

        const authToken = await getAuthData(process.env.AUTH_URL);
        const limit = 2000;
        let start = 0;

        const eventsData = await getData(`https://app.247software.com/event?data={"start":${start},"limit":${limit}}`, authToken);
        const usefulEventsData = sortEventData(eventsData);
        databaseEvents.insert(usefulEventsData, (err, newDocs) => {
            if (err) {
                console.log("Error inserting data:", err);
            } else {
                console.log(`Inserted ${newDocs.length} event records starting from index ${start}`);
            }
        });
    } catch (error) {
        console.error("Error fetching events:", error);
    }
}

// Function to fetch work orders
async function fetchWorkOrders() {
    try {
        // Clear existing records in the database
        database.remove({}, { multi: true }, function (err, numRemoved) {
            console.log(err);
            console.log(numRemoved);
        });

        database.persistence.compactDatafile();

        const authToken = await getAuthData(process.env.AUTH_URL);
        const totalRecords = 3000; // Total records to fetch
        const limit = 1000; // Number of records per fetch
        let start = 0; // Start index for pagination

        while (start < totalRecords) {
            const workOrderData = await getData(`https://app.247software.com/workOrders?data={"start":${start},"limit":${limit}}`, authToken);
            if (workOrderData && workOrderData.data) {
                const dataInfo = sortData(workOrderData);
                database.insert(dataInfo, (err, newDocs) => {
                    if (err) {
                        console.log("Error inserting data:", err);
                    } else {
                        console.log(`Inserted ${newDocs.length} work order records starting from index ${start}`);
                    }
                });
            } else {
                console.log("No data fetched for start index:", start);
            }
            start += limit; // Move to the next batch
        }
    } catch (error) {
        console.error("Error fetching work orders:", error);
    }
}

// Schedule fetching every 30 minutes
function scheduleFetching() {
    console.log("Fetching events and work orders...");
    fetchEvents();
    fetchWorkOrders();
}

// Call the fetching functions immediately on server start
scheduleFetching();

// Set up interval to call the fetching functions every 30 minutes
setInterval(scheduleFetching, 1800000); // 1800000 milliseconds = 30 minutes

// Fetch the data from the database and send it to the client
app.get('/api/workorders', (req, res) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-indexed

    // Fetch all work orders
    database.find({}, (err, allWorkOrders) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Fetch work orders from the current year
        database.find({ year: currentYear }, (err, workFromCurrentYear) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Fetch work orders from the current month
            database.find({ year: currentYear, month: currentMonth }, (err, workFromCurrentMonth) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                // Send all the data to the client
                res.json({
                    allWorkOrders,
                    workFromCurrentYear,
                    workFromCurrentMonth
                });
            });
        });
    });
});

// Fetch the data from the database and send it to the client
app.get('/api/events', (req, res) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-indexed
    databaseEvents.find({}, (err, allEvents) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } 

        // Fetch work orders from the current year
        databaseEvents.find({ year: currentYear}, (err, eventsFromCurrentYear) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            console.log(eventsFromCurrentYear);
             // Send all the data to the client
             res.json({
                allEvents,
                eventsFromCurrentYear
            });
        });
    
    });
});



async function getAuthData(authUrl){
    try{
        const response = await fetch( authUrl, {
            method: 'POST'
        });

        if(response.ok) {
            const data = await response.json();
            return extractToken(data);
        } else {
            return `Error: Recieved status code ${response.status}`;
        }
    } catch (error){
        return `Error: ${error}`;
    }
}

async function getData(Url, authToken){
    try{
        const response = await fetch(Url, {
            method: 'GET',
            headers: {
                'Cookie': `jwt_token=${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            return `Error: recived status code ${response.status}`;
        }
    } catch (error) {
        return `Error: ${error}`;
    }
}

function extractToken(authTokenData) {
    try {
        const jwtToken = authTokenData.token;
        if(jwtToken){
            console.log(`Token saved successfully: ${jwtToken}`);
            return jwtToken;
        } else {
            console.log(`Token not found in the response: ${JSON.stringify(authTokenData)}`);
            return null;
        }
    } catch (error) {
        console.log(`Error while extracting token: ${error}`);
        return null;
    }
}



function sortData(data) {
    const newData = data.data // Slice the array correctly
    const dataInfo = []; // Define dataInfo in the right scope
    // Iterate over newData and populate dataInfo
    for (let i = 0; i < newData.length; i++) {
        let created_on_date = new Date(newData[i].created_on);
        dataInfo.push({
            created_on: newData[i].created_on,
            year: created_on_date.getFullYear(),
            month: created_on_date.getMonth(),
            submitted_on: newData[i].forms.primary_form.formData.submitted,
            number: newData[i].forms.primary_form.formData.work_order_no,
            status: newData[i].forms.primary_form.formData.status.id,
            summary: newData[i].forms.primary_form.formData.summary,
            work_type: newData[i].forms.primary_form.formData.work_order_type_default_field_nested_picker,
            overdue: newData[i].forms.primary_form.formData.is_overdue,
            completed_by: newData[i].forms.primary_form.formData.completed_by_default_field_dropdown
        });
    }
    return dataInfo; // Return the populated array
}

function sortEventData(data){
    const newData = data.data // Slice the array correctly
    const dataInfo = []; // Define dataInfo in the right scope
    // Iterate over newData and populate dataInfo
    for (let i = 0; i < newData.length; i++) {
        let created_on_date = new Date(newData[i].start_time);
        dataInfo.push({
            facility: newData[i].facility_name,
            event: newData[i].event_name,
            type: newData[i].event_type_name,
            start: newData[i].start_time,
            end: newData[i].end_time,
            year: created_on_date.getFullYear(),
            month: created_on_date.getMonth(),
        });
    }
    return dataInfo; // Return the populated array
}
