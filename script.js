const imageUpload = document.getElementById('imageUpload')

// Sportradar API Data
const player_profile = 'https://api.sportradar.us/nfl/official/trial/v7/en/players/1fd00ec3-b758-46d2-a2c1-cca521ea8a54/profile.json?api_key=tu9xyupqc4cznkuxs7csgtrk'
const team_profile = 'https://api.sportradar.us/nfl/official/trial/v7/en/teams/97354895-8c77-4fd4-a860-32e62ea7382a/profile.json?api_key=tu9xyupqc4cznkuxs7csgtrk'
const game_roster = 'https://api.sportradar.us/nfl/official/trial/v7/en/games/f0e1490c-e9c3-479d-b937-cb2e3930b29b/roster.json?api_key=tu9xyupqc4cznkuxs7csgtrk'
const season_schedule = 'https://api.sportradar.us/nfl/official/trial/v7/en/games/2021/REG/schedule.json?api_key=tu9xyupqc4cznkuxs7csgtrk'
const API_key = 'tu9xyupqc4cznkuxs7csgtrk'
const players_id = 
  {
    'Mac Jones': '1fd00ec3-b758-46d2-a2c1-cca521ea8a54',
    'Tom Brady': '41c44740-d0f6-44ab-8347-3b5d515e5ecf',
    'Patrick Mahomes': '11cad59d-90dd-449c-a839-dddaba4fe16c'
  }
const teams_id = 
  {
    'Tampa Bay Buccaneers': '4254d319-1bc7-4f81-b4ab-b5e6f3402b69',
    'Kansas City Chiefs': '6680d28d-d4d2-49f6-aace-5292d3ec02c2'
  }

// Execute the async function start
Promise.all([
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
]).then(start)



async function start(){
    let image
    const container = document.querySelector('.img-content')

    const labeledFaceDescriptors = await loadLabeledImages() 
    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, .6)

    document.querySelector('#loader').style.display = 'none'

    imageUpload.addEventListener('change', async () => {

      // Remove the previous image
      if (image) image.remove()

        image = await faceapi.bufferToImage(imageUpload.files[0])
        container.append(image)

        const detection = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors()

        const displaySize = {width: image.width, height: image.height}

        const canvas = document.querySelector('#canvas')

        faceapi.matchDimensions(canvas, displaySize)

        // Resizing the container of the image
        document.querySelector('.img-container').style.width = displaySize.width + 'px'
        document.querySelector('.img-container').style.height = displaySize.height + 'px'
        document.querySelector('.img-container').style.display = 'block'
        
        // Reseting the stats
        document.querySelector('#stats-players').innerHTML = '<h2>Stats </h2><small>(data: Sportradar US API)</small>';
      
        const resizedDetections = faceapi.resizeResults(detection, displaySize)

        results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor))

        // For each for every result
        results.forEach((result, i) => {
          const box = resizedDetections[i].detection.box

          const drawBox = new faceapi.draw.DrawBox(box, {
            label: result.toString()
          })
          const player_name = result.toString().split(' (')[0];
          drawBox.draw(canvas)

          // If the result is a player that exists in database so run the showInfos function
          if(player_name!='unknown'){
              fetch('./stats/'+player_name+'.json')
              .then(response => {
                return response.json();
              })
              .then(jsondata => {

                // Params: player name, all the Sportradar data from him and his index
                showInfos(player_name, jsondata, i);
              });

          }
        });
        

    })
}
function showInfos(player_name, jsondata, i){
 
  document.querySelector('#stats-players').innerHTML += '<div class="stats"><h3>'+player_name+'</h3><div class="stats-body '+player_name.replace(' ','')+'"></div></div>';

  // Variable to know what season are the code reading to add up all the stats to return the career stats
  let itemsProcessed = 0;

  // Variable to all the stats
  let temporadas = 0, passAtt = 0, passCmp = 0, yards = 0, touchdowns = 0, int = 0, gamesPlayed = 0;

  jsondata.seasons.forEach((element, index, array) => {

    // The season just count as season if is a regular season, Sportradar data break the postseason from the regular season
    if(element.type=='REG'){
      temporadas ++;
    }

    itemsProcessed++

    // Only add up the stats if the player has at least 1 game played
    if(element.teams[0].statistics.games_played>0){
      const stats_player = element.teams[0].statistics;

        passAtt += stats_player.passing.attempts;
        passCmp += stats_player.passing.completions;
        yards += stats_player.passing.yards;
        touchdowns += stats_player.passing.touchdowns;
        int += stats_player.passing.interceptions;
        gamesPlayed += stats_player.games_played
        
      
        // Only show up the stats if the code already read and added all the regular seasons stats
        if(itemsProcessed==array.length){

          document.querySelector('.'+player_name.replace(' ','')).innerHTML = '<div class="season-player"><p>Temporadas jogadas: <span>'+temporadas+'</span></p> <p>Jogos: <span>'+gamesPlayed+'</span></p> <p>Tentativas de passe: <span>'+passAtt + '</span></p> <p>Passes completos: <span>'+passCmp+'</span></p> <p>Jardas: <span>'+yards+'</span></p> <p>Touchdowns: <span>'+touchdowns+'</span></p> <p>Interceptações: <span>'+int+'</span></p></div>'
        }
      
    }
  })

}


function loadLabeledImages() {
  const labels = ['Tom Brady', 'Mac Jones', 'Patrick Mahomes']
  return Promise.all(
      labels.map(async label => {
          var typeImage;
          const descriptions = []

          // read all the 4 labeled_images and push the result to the 'descriptions' array
          for (let i = 1; i <= 4; i++) {


              const img = await faceapi.fetchImage(`https://raw.githubusercontent.com/anti-duhring/get-NFL-QB-stats-with-face-recognition-/main/labeled_images/${label}/${i}.png`)
              const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
              descriptions.push(detections.descriptor)
          }
        
          return new faceapi.LabeledFaceDescriptors(label, descriptions)
      })
  )
}
