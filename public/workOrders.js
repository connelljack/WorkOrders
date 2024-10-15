document.addEventListener('DOMContentLoaded', () => {
    const outputDiv = document.getElementById('output');

    // Function to fetch work orders
    async function fetchWorkOrders() {
        try {
            const response = await fetch('/api/workorders');
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }

            const workOrders = await response.json();
            const allWorkOrders = workOrders.allWorkOrders;
            const workFromCurrentYear = workOrders.workFromCurrentYear;
            const workFromCurrentMonth = workOrders.workFromCurrentMonth;

            const openMonth = workFromCurrentMonth.filter(obj => obj.status === 0 || obj.status === 2 || obj.status === 3);
            const closedMonth = workFromCurrentMonth.filter(obj => obj.status === 1 || obj.status === 4 || obj.status === 5);
            const closedYear = workFromCurrentYear.filter(obj => obj.status === 1 || obj.status === 4 || obj.status === 5);
            const overdue = workFromCurrentYear.filter(obj => obj.overdue === 1);

            console.log('All work orders:', allWorkOrders);
            console.log('Work orders from the current year:', workFromCurrentYear);
            console.log('Work orders from the current month:', workFromCurrentMonth);

            //Display this months work Orders in a table
            displayWorkOrders(workFromCurrentMonth);

            //Display numbers for headers 
            const openWorkOrdersHeader = document.getElementById('valueOpen');
            openWorkOrdersHeader.textContent = openMonth.length;
            const open14Header = document.getElementById('value14');
            open14Header.textContent = overdue.length;
            const completedWorkOrdersHeader = document.getElementById('valueC');
            completedWorkOrdersHeader.textContent = closedMonth.length;
            const completedWorkOrdersYTD = document.getElementById('valueCY');
            completedWorkOrdersYTD.textContent = closedYear.length;

            //Display Line graph
            const ctxLine = document.getElementById('chartLine');
            const yLine = create_y_axis_line(workFromCurrentYear);
            createChart(ctxLine, 'line', ['Jan', 'Feb', 'Mar', 'Apr',
                'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], 
            [
                { label: 'Current Year', data: yLine, borderWidth: 1 }
            ], lineChartOptions()); 

            //Display Pie graph
            const facs = ['FAC-AC/HEAT', 'FAC-BATHROOM','FAC-CEILING','FAC-DOOR',
                'FAC-FLOOR','FAC-FURNITURE','FAC-LEAK','FAC-LIGHTS',
                'FAC-OTHER','FAC-PAINT','FAC-SEAT-REP','FAC-SINK',
                'FAC-TABLE','FAC-WALL-REP','FAC-WINDOW',];
            const ctxPie = document.getElementById('chartPie');
            const yPie = create_y_axis_pie(facs, workFromCurrentMonth);
            createChart(ctxPie, 'pie', facs, [{
                label: 'Work Order Types',
                data: yPie,
                borderWidth: 1,
                backgroundColor: pieChartColors()
            }], pieChartOptions());

            const ctxBar = document.getElementById('chartBar');
            const barData = who(workFromCurrentMonth);
            // Extract names and counts
            const labels = barData.map(item => item.name);
            const counts = barData.map(item => item.count);
            createChart(ctxBar, 'bar', labels, [{
                label: 'Work Order Types',
                data: counts,
                borderWidth: 1
            }], barChartOptions());

            
        } catch (error) {
            console.error('Error fetching work orders:', error);
            outputDiv.innerHTML = `<p>Error: ${error.message}</p>`;
        }
    }

    // Function to fetch events
    async function fetchEvents() {
        try {
            const response = await fetch('/api/events');
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }

            const events = await response.json();

            const eventsYear = events.eventsFromCurrentYear;
            const axis = create_axis_events(eventsYear);

            const ctxBar2 = document.getElementById('chartBar2');
            createChart(ctxBar2, 'bar', axis.labels, [{
                label: 'Event Types',
                data: axis.counts,
                backgroundColor: 'rgba(255, 99, 132, 0.6)',
                borderWidth: 1
            }], barChartOptionsHorizontal());
            
            //displayEvents(events);

        } catch (error) {
            console.error('Error fetching events:', error);
            outputDiv.innerHTML = `<p>Error: ${error.message}</p>`;
        }
    }

    function displayWorkOrders(workOrders) {
        const workOrdersDiv = document.getElementById('workOrdersOutput'); // Get the div for work orders
        workOrdersDiv.innerHTML = ''; // Clear previous output
        if (workOrders.length === 0) {
            workOrdersDiv.innerHTML = '<p>No work orders found.</p>';
            return;
        }
    
        workOrders.sort((a, b) => new Date(b.created_on) - new Date(a.created_on));
    
        const table = document.createElement('table');
        const headerRow = document.createElement('tr');
        const headers = ['Created On', 'Submitted On', 'Number', 'Status', 'Summary', 'Work Type', 'Overdue', 'Completed By'];
        headers.forEach(header => {
            const th = document.createElement('th');
            th.innerText = header;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);
    
        workOrders.forEach(workOrder => {
            const row = document.createElement('tr');
            const { created_on, submitted_on, number, status, summary, work_type, overdue, completed_by } = workOrder;
            const values = [created_on, submitted_on, number, status, summary, work_type, overdue, completed_by];
    
            values.forEach(value => {
                const td = document.createElement('td');
                td.innerText = value;
                row.appendChild(td);
            });
    
            table.appendChild(row);
        });
    
        workOrdersDiv.appendChild(table);
    }
    
    function displayEvents(events) {
        const eventsDiv = document.getElementById('eventsOutput'); // Get the div for events
        eventsDiv.innerHTML = ''; // Clear previous output
        if (events.eventsFromCurrentYear.length === 0) {
            eventsDiv.innerHTML = '<p>No events found.</p>';
            return;
        }
    
        events.eventsFromCurrentYear.sort((a, b) => new Date(b.start) - new Date(a.start));
        
         // Limit to the last 100 events
        const last100Events = events.eventsFromCurrentYear.slice(0, 100);

        const table = document.createElement('table');
        const headerRow = document.createElement('tr');
        const headers = ['Facility', 'Event', 'Type', 'Start', 'End'];
        headers.forEach(header => {
            const th = document.createElement('th');
            th.innerText = header;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);
    
        last100Events.forEach(event_ => {
            const row = document.createElement('tr');
            const { facility, event, type, start, end } = event_;
            const values = [facility, event, type, start, end];
    
            values.forEach(value => {
                const td = document.createElement('td');
                td.innerText = value;
                row.appendChild(td);
            });
    
            table.appendChild(row);
        });
    
        eventsDiv.appendChild(table);
    }
    


    // Fetch work orders and events every 30 seconds
    fetchWorkOrders(); // Initial fetch
    fetchEvents(); // Initial fetch
    setInterval(() => {
        fetchWorkOrders();
        fetchEvents();
    }, 30000); // 
});


function createChart(ctx, type, labels, data, options) {
    return new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: data
        },
        options: options
    });
}

function lineChartOptions(){
    return{ maintainAspectRatio: false, 
        responsive: false,
    scales: {
        y: {
            stacked: true
        }
    }
    }
}

function pieChartOptions(){
    return{
        responsive: true,
        aspectRatio: 1.25,  // Change the aspect ratio (width / height)
        plugins: {
            legend: {
                display: true, // Hide the default legend if desired
                position: 'right'
            },
            datalabels: {
                color: '#fff', // Set text color
                formatter: (value, ctx) => {
                    return ctx.chart.data.labels[ctx.dataIndex]; // Use the label as the text
                },
                anchor: 'center', // Position the label in the center of the pie slice
                align: 'center',  // Align text at the center of the slice
                font: {
                    weight: 'bold', // Make the font bold
                    size: 14        // Adjust font size if necessary
                }
            }
        }
    }
}

function pieChartColors(){
    return[
        '#FF0000', '#FF4500', '#FF7F00', '#FFD700', '#FFFF00', 
        '#ADFF2F', '#00FF00', '#32CD32', '#00FA9A', '#00FFFF', 
        '#1E90FF', '#0000FF', '#8A2BE2','#9400D3',  '#FF00FF'
    ];
    
}

function barChartOptions(){
    return{
        responsive: true,
        aspectRatio: 1.25,  // Change the aspect ratio (width / height)
        plugins: {
            legend: {
                display: false // Hide the default legend if desired
            },
            datalabels: {
                color: '#fff', // Set text color
                formatter: (value, ctx) => {
                    return ctx.chart.data.labels[ctx.dataIndex]; // Use the label as the text
                },
                anchor: 'center', // Position the label in the center of the pie slice
                align: 'center',  // Align text at the center of the slice
                font: {
                    weight: 'bold', // Make the font bold
                    size: 14        // Adjust font size if necessary
                }
            }
        }        
    }
}

function barChartOptionsHorizontal(){
    return{
        indexAxis: 'y',
        responsive: true,
        aspectRatio: 1.25,  // Change the aspect ratio (width / height)
        plugins: {
            legend: {
                display: false // Hide the default legend if desired
            },
            datalabels: {
                color: '#fff', // Set text color
                formatter: (value, ctx) => {
                    return ctx.chart.data.labels[ctx.dataIndex]; // Use the label as the text
                },
                anchor: 'center', // Position the label in the center of the pie slice
                align: 'center',  // Align text at the center of the slice
                font: {
                    weight: 'bold', // Make the font bold
                    size: 14        // Adjust font size if necessary
                }
            }
        }        
    }
}


function who(data){
    try {
        let names = [];
        for(let i =0; i< data.length; i++){
            let nameField = data[i].completed_by;
            
            if (typeof nameField === 'string' && nameField.length > 0) {
                let individualNames = nameField.split(',').map(name => name.trim());

                individualNames.forEach( name => {
                    let existingName = names.find( n => n.name === name);
                
                    if(existingName){
                        existingName.count++;
                    }
                    else{
                        names.push({name: name, count: 1});
                    }
                })
            }
        }
        return names;
    } catch (error) {
        console.log(error);
    }
}

function create_y_axis_line(data){
    const y = Array(12).fill(0)
    for( let i = 0; i< data.length; i++){
        y[data[i].month]++;
    }
    return y;
}

function create_y_axis_pie( factypes, data){
    const y = Array(factypes.length).fill(0)
    data.forEach(order => {
        const facultyIndex = factypes.indexOf(order.work_type);
        if (facultyIndex !== -1) {
            y[facultyIndex]++;
        }
    });
    return y;
}

function create_axis_events(data){
    try {
        let types = [];
        for(let i =0; i< data.length; i++){
            let typeField = data[i].type;
            if (typeof typeField === 'string' && typeField.length > 0) {
                let existingType = types.find( n => n.type === typeField);
                    if(existingType){
                        existingType.count++;
                    }
                    else{
                        types.push({type: typeField, count: 1});
                    }
            }
        }
        const labels = types.map(item => item.type);
        const counts = types.map(item => item.count);
        return {labels, counts};
    } catch (error) {
        console.log(error);
    }
}
