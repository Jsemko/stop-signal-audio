var stop_signal_utils = {
  get_timeline_sample: function({images, size, is_stop_trial, stimulus_type}) {
    sampled_images = jsPsych.randomization.sampleWithReplacement(images, size)
    var timeline_objs = sampled_images.map(
      (x) => {
        return { image: x, is_stop_trial: is_stop_trial, stimulus_type: stimulus_type}
    })
    return timeline_objs;
  },

  shuffled_timelines: function(list_of_params) {
    return jsPsych.randomization.shuffle(
      list_of_params.map(this.get_timeline_sample).flat());
  },
};


jsPsych.plugins["stop-signal-audio"] = (function() {

  var plugin = {};

  plugin.info = {
    parameters : {
      stimulus: {
        type: jsPsych.plugins.parameterType.IMAGE,
        pretty_name: 'Stimulus',
        default: null,
        description: 'Image to show',
      },
      tone: {
        type: jsPsych.plugins.parameterType.AUDIO,
        pretty_name: 'tone',
        default: null,
        description: 'An audio file that represents the audio beep',
      },
      is_stop_trial: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Is stop trial',
        default: false,
        description: 'If true, is a stop-trial',
      },
      response_ends_trial: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Response ends trial',
        default: true,
        description: 'If true, response will immediately end the trial',
      },
      trial_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Trial duration',
        default: null,
        description: 'The maximum amount of time the stimulus is shown',
      },
      stimulus_type: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Stimulus type',
        default: null,
        description: 'Reference to the type of stimulus. This is useful to keep stop-signal delays separate.',
      },
      stop_signal_adjustment: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Stop Signal Adjustment',
        default: null,
        description: 'How much time to adjust ssd on successful/unsuccessful stop-trials',
      },
      choices: {
        type: jsPsych.plugins.parameterType.KEYCODE,
        array: true,
        pretty_name: 'Choices',
        default: jsPsych.ALL_KEYS,
        description: 'The keys the subject is allowed to press to respond to the stimulus.'
      },
      stimulus_height: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Image height',
        default: null,
        description: 'Set the image height in pixels',
      },
      stimulus_width: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Image width',
        default: null,
        description: 'Set the image width in pixels',
      },
      maintain_aspect_ratio: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Maintain aspect ratio',
        default: true,
        description: 'Maintain the aspect ratio after setting width or height',
      },
    }
  }
  plugin.trial = function(display_element, trial) {
    console.assert(window.stop_signal_delay_obj !== undefined,
      "stop_signal_delay_obj must be globally declared")
    if(trial.is_stop_trial) {
    console.assert(window.stop_signal_delay_obj[trial.stimulus_type] !== undefined,
      `stop_signal_delay_obj does not have attribute ${trial.stimulus_type}`)
    }
    // compile image html
    var style = ''
    if(trial.stimulus_height !== null){
      style += `height:${trial.stimulus_height}px; `;
      if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
        style += 'width: auto; ';
      }
    }
    if(trial.stimulus_width !== null){
      style += `width:${trial.stimulus_width}px; `;
      if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
        style += 'height: auto; ';
      }
    }
    var html = `
      <img src="${trial.stimulus}"
      id="image-stimulus" style="${style}"></img>
      `

    var audio = jsPsych.pluginAPI.getAudioBuffer(trial.tone);
    audio.currentTime = 0;

    var response = {
      rt: null,
      key: null
    };

    var adjust_stop_signal_delay = function(trial, response){
      if(!trial.is_stop_trial) {
        return;
      }

      new_delay = window.stop_signal_delay_obj[trial.stimulus_type];

      if(response.key !== null) {
        // Subject failed to stop; make it easier by subtracting from delay.
        new_delay -= trial.stop_signal_adjustment;
        new_delay = Math.max(
          trial.stop_signal_adjustment,
          new_delay);
      } else {
        new_delay += trial.stop_signal_adjustment;
        new_delay = Math.min(
          trial.trial_duration - trial.stop_signal_adjustment,
          new_delay);
      }
      window.stop_signal_delay_obj[trial.stimulus_type] = new_delay;
    }

    function end_trial() {
      // kill any remaining setTimeout handlers
      jsPsych.pluginAPI.clearAllTimeouts();

      audio.pause();

      // kill keyboard listeners
      jsPsych.pluginAPI.cancelAllKeyboardResponses();

      var trial_data = {
        "rt": response.rt,
        "stimulus": trial.stimulus,
        "stimulus_type": trial.stimulus_type,
        "key_press": response.key,
        "is_stop_trial": trial.is_stop_trial,
      };

      adjust_stop_signal_delay(trial, response);

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
        console.log(`Press Delay: ${Date.now() - start} Milliseconds`)
      }

      if (trial.response_ends_trial) {
        end_trial();
      }
    };

    var start = Date.now()
    // render
    display_element.innerHTML = html;

    var play_audio = function() {
        audio.play();
        console.log(`Audio Delay: ${Date.now() - start} Milliseconds`)
    }

    var keyboardListener = jsPsych.pluginAPI.getKeyboardResponse({
      callback_function: after_response,
      valid_responses: trial.choices,
      rt_method: 'performance',
      persist: false,
      allow_held_key: false
    });

    // end trial if time limit is set
    if (trial.trial_duration !== null) {
      jsPsych.pluginAPI.setTimeout(() => end_trial(), trial.trial_duration);
    }
    // start audio
    if(trial.is_stop_trial) {
       jsPsych.pluginAPI.setTimeout(
         play_audio,
         window.stop_signal_delay_obj[trial.stimulus_type]);
    }

  };

  return plugin;
})()
