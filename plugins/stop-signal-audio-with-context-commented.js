jsPsych.plugins["stop-signal-audio"] = (function() {

  var plugin = {};

  plugin.info = {
    parameters : {
      stimulus: {
        type: jsPsych.plugins.parameterType.IMAGE
      },
      tone: {
        type: jsPsych.plugins.parameterType.AUDIO
      },
      play_tone: {
        type: jsPsych.plugins.parameterType.BOOL,
        default: true,
      },
      trial_duration: {
        type: jsPsych.plugins.parameterType.INT,
      },
      stimulus_height: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Image height',
        default: null,
        description: 'Set the image height in pixels'
      },
      stimulus_width: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Image width',
        default: null,
        description: 'Set the image width in pixels'
      },
      maintain_aspect_ratio: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Maintain aspect ratio',
        default: true,
        description: 'Maintain the aspect ratio after setting width or height'
      },
    }
  }
  plugin.trial = function(display_element, trial) {
    // compile image html
    var html = '<img src="'+trial.stimulus+'" id="image-stimulus" style="';
    if(trial.stimulus_height !== null){
      html += 'height:'+trial.stimulus_height+'px; '
      if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
        html += 'width: auto; ';
      }
    }
    if(trial.stimulus_width !== null){
      html += 'width:'+trial.stimulus_width+'px; '
      if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
        html += 'height: auto; ';
      }
    }
    html +='"></img>';

    //  // add prompt
    //  if (trial.prompt !== null){
    //    html += trial.prompt;
    //  }
    var context = jsPsych.pluginAPI.audioContext();
    // if(context !== null){
    //   var source = context.createBufferSource();
    //   source.buffer = jsPsych.pluginAPI.getAudioBuffer(trial.tone);
    //   source.connect(context.destination);
    // } 
    var audio = jsPsych.pluginAPI.getAudioBuffer(trial.tone);
    audio.currentTime = 0;

    // audio.addEventListener('ended', end_trial);

    var response = {
      rt: null,
      key: null
    };

    function end_trial() {
      // kill any remaining setTimeout handlers
      jsPsych.pluginAPI.clearAllTimeouts();

      // stop the audio file if it is playing
      // remove end event listeners if they exist
      // if(context !== null){
      //   source.stop();
      //   source.onended = function() { }
      // } else {
        audio.pause();
        audio.removeEventListener('ended', end_trial);
      // }

      // kill keyboard listeners
      jsPsych.pluginAPI.cancelAllKeyboardResponses();

      // gather the data to store for the trial
      if(context !== null && response.rt !== null){
        response.rt = Math.round(response.rt * 1000);
      }
      var trial_data = {
        "rt": response.rt,
        "stimulus": trial.stimulus,
        "key_press": response.key,
        "play_tone": trial.play_tone,
      };

      // clear the display
      display_element.innerHTML = '';

      // move on to the next trial
      jsPsych.finishTrial(trial_data);
    };


    // function to handle responses by the subject
    var after_response = function(info) {

      // only record the first response
      if (response.key == null) {
        response = info;
      }

      if (trial.response_ends_trial) {
        end_trial();
      }
    };

    // render
    display_element.innerHTML = html;


    var start = Date.now()
    
    console.log(start - Date.now())
    var play_audio = function() {
      // if(context !== null){
      //   startTime = context.currentTime;
      //   source.start(startTime);
      // } else {
        audio.play();
        console.log(Date.now() - start)

      // }
    }

    // start the response listener
    // if(context !== null) {
    //   var keyboardListener = jsPsych.pluginAPI.getKeyboardResponse({
    //     callback_function: after_response,
    //     valid_responses: trial.choices,
    //     rt_method: 'audio',
    //     persist: false,
    //     allow_held_key: false,
    //     audio_context: context,
    //     audio_context_start_time: startTime
    //   });
    // } else {
      var keyboardListener = jsPsych.pluginAPI.getKeyboardResponse({
        callback_function: after_response,
        valid_responses: trial.choices,
        rt_method: 'performance',
        persist: false,
        allow_held_key: false
      });
    //}

    // end trial if time limit is set
    if (trial.trial_duration !== null) {
      jsPsych.pluginAPI.setTimeout(function() {
        end_trial();
      }, trial.trial_duration);
    }
    // start audio
    if(trial.play_tone) {
       jsPsych.pluginAPI.setTimeout(play_audio, 1000);
    }

  };

  return plugin;
})()
