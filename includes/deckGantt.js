/** File with all function to retrieve deck data  */

var apiUrl = ' ';
var login = ' ';
var password = ' ';
var boardDiv = 'board_list';

/****** GESTION DES REQUETES ****/

/**
 *
 * @param url
 * @param params
 * @param reload
 * @param callbackSuccess
 * @param callbackError
 */
function sendRequest(method,url,params=null,reload=false, callbackSuccess=null,callbackError=null) {

    let xhr = new XMLHttpRequest();

    xhr.open(method, url, true);

    let credentials= window.btoa(login+':'+unescape(encodeURIComponent(password)));

    xhr.setRequestHeader("Authorization","Basic "+credentials);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onreadystatechange = function() {
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {

            if(reload === true)
            {
                document.location.reload();
            }
            else if(callbackSuccess)
            {
                let fn = window[callbackSuccess];
                if (typeof fn === "function") fn(this.responseText);
            }
        }
        else if (this.readyState === XMLHttpRequest.DONE && this.status !== 200)
        {
            if(callbackError)
            {
                let fn = window[callbackError];
                if (typeof fn === "function") fn();
            }
        }
    }
    xhr.send(params);
}

function createTasks(data) {
    let tasksArray = [];
    let stacks = JSON.parse(data);
    for(let stack of stacks) {
        console.log(stack.cards);
        if(stack.cards) {

            for( let task of stack.cards )
            {
                if(task.duedate)
                {
                    //convert date due date to string if defined else date of the day
                    let refDate = new Date();
                    if(task.duedate) {
                        refDate = new Date(task.duedate);
                    }
                    let endDate = refDate.getFullYear() + '-' + ( refDate.getMonth() + 1 ) + '-' + refDate.getDate() ;

                    //Get duration in unix timestamp format of task in description if set between ||123564561321|| else set one day(86400) and class
                    let barClass = 'bar-blue';
                    let duration = null;
                    let progression = 0;
                    let dependencies = '';

                    if(task.description)
                    {
                        // Get duration in days
                        if(task.description.indexOf("d:") != -1 )
                        {
                            duration = task.description.substring(
                                task.description.indexOf("d:") + 2,
                                task.description.indexOf(":d"),
                            );
                        }

                        // Get class name
                        if(task.description.indexOf("c:") != -1 )
                        {
                            barClass = task.description.substring(
                                task.description.indexOf("c:") + 2,
                                task.description.indexOf(":c"),
                            );
                        }

                        // Get progression ( 0-100)
                        if(task.description.indexOf("p:") != -1 )
                        {
                            progression = task.description.substring(
                                task.description.indexOf("p:") + 2,
                                task.description.indexOf(":p"),
                            );
                        }

                        // Get dependencies
                        if(task.description.indexOf("w:") != -1 )
                        {
                            dependencies = task.description.substring(
                                task.description.indexOf("w:") + 2,
                                task.description.indexOf(":w"),
                            );
                        }


                    }
                    if( !duration  || duration == -1 ) {
                        duration= 1;
                    }
                    refDate.setDate(refDate.getDate() - duration);
                    let startDate = refDate.getFullYear() + '-' + ( refDate.getMonth() + 1 ) + '-' + refDate.getDate() ;
                    tasksArray.push( {
                        id: task.id.toString(),
                        name: task.title,
                        start: startDate,
                        end: endDate,
                        progress: progression,
                        custom_class: barClass,
                        refDate: refDate,
                        stack_id : task.stackId,
                        board_id : 6,
                        card_id : task.id,
                        card_description : task.description,
                        order: task.order,
                        dependencies: dependencies
                    });
                }
            }
        }
    }

    if(tasksArray.length > 0)
    {
        document.getElementById("board_error").style.display = "none";
        document.getElementById("gantt").style.display = "block";

        createGantt(tasksArray.sort(function (a, b) {
            return a.refDate.getTime() - b.refDate.getTime();
          })
        );
    }
    else
    {
        document.getElementById("board_error").style.display = "block";
        document.getElementById("gantt").style.display = "none";
        document.getElementById('board_error').innerHTML = 'No card available check if due date is set ?';
    }
}

function cardUpdated(data) {
    console.log('Card update ! set here action after upte if needed ' );
}

function udpateCard(task,start,end,progress=null)
{

    // To calculate the time difference of two dates
    var durationInTime = end.getTime() - start.getTime();
    // To calculate the nb of days between two dates
    var durationInDays = Math.round(durationInTime / (1000 * 3600 * 24));

    let description = ' ';
    if(task.card_description)
    {
        description = task.card_description;
    }

    console.log(description.search(/d:(.*?):d/));
    if(description.search(/d:(.*?):d/) != -1 )
    {
        description = description.replace(/d:(.*?):d/,'d:'+(durationInDays-1)+':d');
    }
    else{
        description = 'd:'+(durationInDays-1)+':d\n' + description;
    }

    if(progress)
    {
        description = description.replace(/p:(.*?):p/,'p:'+progress+':p');
    }

    let params = {
        "title": task.name,
        "description": description,
        "type": "plain",
        "order": 999,
        "duedate": end,
        "owner": ""
     };

    sendRequest('PUT',apiUrl+'/'+task.board_id+'/stacks/'+task.stack_id+'/cards/'+task.card_id,JSON.stringify(params),false,'cardUpdated');
}

function createGantt(tasks) {
    var gantt = new Gantt("#gantt", tasks, {
        header_height: 50,
        column_width: 30,
        step: 24,
        view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
        bar_height: 30,
        bar_corner_radius: 3,
        arrow_curve: 5,
        padding: 18,
        view_mode: 'Day',
        date_format: 'YYYY-MM-DD',
        custom_popup_html: null,
        custom_class: 'bar-red',
        language: 'fr',
        on_click: function (task) {
            console.log(task);
        },
        on_date_change: function(task, start, end) {
            console.log(task, start, end);
            udpateCard(task,start,end)
        },
        on_progress_change: function(task, progress) {
            console.log(task, task._start, task._end, progress);
            udpateCard(task,task._start, task._end, progress);
        },
        on_view_change: function(mode) {
            console.log(mode);
        }
    });
}

function getBoardCards(boardId = 6 ) {
    sendRequest('GET',apiUrl+'/'+boardId+'/stacks',null,false,'createTasks');
}

function getBoards() {
    sendRequest('GET',apiUrl,null,false,'showBoards');
}

function showBoards(data) {
    let boardsArray = [];
    let boards = JSON.parse(data);
    console.log("------------------ SHOW AVAILABLES BOARDS ----------------------");
    let boardView = document.getElementById(boardDiv);
    boardView.innerHTML = ' ';

    for(let board of boards) {
        let boardEntry = document.createElement("div");
        boardEntry.className = "board-link";
        boardEntry.onclick = function () {
            getBoardCards(board.id);
        }
        let boardContent = document.createTextNode(board.title );
        boardEntry.appendChild(boardContent);
        // Add to board view
        boardView.appendChild(boardEntry)
    }
}

function connectToApi() {
    console.log("connect to api");
    apiUrl = document.getElementById("api_url").value;
    login = document.getElementById("login").value;
    password = document.getElementById("password").value;
    getBoards();
}
