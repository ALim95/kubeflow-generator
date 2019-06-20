const DARKNET = "alim95/darknet-test:v6";
const DARKNET_OPENCV = "alim95/darknet-test:opencv-v1.1";
const DARKNET_MODELDB = "alim95/darknet-test:modeldb-v4.1";
var curr_component_num = 0;
var component_num = 0;
var component_list = [];
var generated_code = "";
var mdb_host = $("#hidden-mdbhost").val();

$(document).ready(function(){        
    if ($('#pipeline-hostname').val()=='') {
        $('#pipeline-hostname').removeAttr('disabled');
    }
    if ($('#modeldb-hostname').val()=='') {
        $('#modeldb-hostname').removeAttr('disabled');
    }
    $('.modal-background').click(function(){
        $(this).closest('.modal').removeClass('is-active');
    });
    $("#add-component-button").click(addComponent());
    $("#generate-pipeline-button").click(generatePipeline());
});

// Displays Pipeline code and timestamp
function generatePipeline() {
    return function () {
        var inputs_filled = true;
        inputs_filled = checkFieldsFilled(inputs_filled);
        if (inputs_filled == false) {
            console.log("no info");
        }
        else {
            $('.tabs').show();
            $('#code-tab').click(showPipelineCode());
            $('#diagram-tab').click(showPipelineDiagram());
            var { pipeline_directory_maker, pipeline_output_maker, pipeline_directory_location, componentString, component_params } = getPipelineComponents();
            var dt = new Date();
            var timestamp = dt.getFullYear().toString() + (dt.getMonth() + 1).toString() + dt.getDate().toString() + dt.getHours().toString() + dt.getMinutes().toString() + dt.getSeconds().toString();
            $("#generated-timestamp").empty().append("on: " + dt + `
            <a class="button is-info is-outlined is-small" id="copy-text-button">
                <span class="icon">
                    <i class="far fa-clipboard"></i>
                </span>
                <span id="copy-text-button-text">Copy to clipboard</span>
            </a>`);
            generatePipelineCode(pipeline_directory_maker, pipeline_output_maker, pipeline_directory_location, timestamp, componentString, component_params);
            $("#generated-pipeline").empty().append(generated_code);
            $('#copy-text-button').click(copyPipelineCodeText());
        }
        hljs.initHighlighting.called = false;
        hljs.initHighlighting();
    };

    function checkFieldsFilled(inputs_filled) {
        // Checks if there is at least one component
        if (curr_component_num == 0) {
            $(".modal").addClass('is-active');
            inputs_filled = false;
        }
        // Checks if the number of gpu is numerical
        if (!($.isNumeric($("#num-gpu-field").val())) && $("#num-gpu-field").val() != "") {
            $("#num-gpu-field").css("border", "red 1px solid");
            inputs_filled = false;
        }
        else {
            $("#num-gpu-field").css("border", "");
        }
        // Makes custom image field compulsory if user is using custom images
        if ($(".component-image").val() == "Custom") {
            $("#custom-image").addClass('compulsory-info');
        }
        else {
            $("#custom-image").removeClass('compulsory-info');
            $("#custom-image").css("border", "");
        }
        // Checks that every compulsory field is filled up
        $(".compulsory-info").each(function () {
            if (this.value == "" || this.value == "Select image") {
                inputs_filled = false;
                this.style = ("border: red 1px solid");
            }
            else {
                this.style = ("border: ;");
            }
        });
        return inputs_filled;
    }
}

// Gets the Pipeline components variables
function getPipelineComponents() {
    var component_name_arr = [];
    var arrayLength = component_list.length;
    var componentString = "";
    for (var i = 0; i < arrayLength; i++) {
        var component_image = $("#" + component_list[i]).find(".component-image").val();
        var component_name = $("#" + component_list[i]).find("#component-name").val();
        var component_command = $("#" + component_list[i]).find("#component-command").val();

        // Gets the number of gpu to use and ensure that user has entered a numeric input
        var num_gpu_to_use = "0";
        if ($.isNumeric($("#" + component_list[i]).find("#num-gpu-field").val())){
            num_gpu_to_use = $("#" + component_list[i]).find("#num-gpu-field").val();
        }

        var darknet_action = "";
        var darknet_action_checked = true;
        var darknet_data = "";
        var darknet_config = "";
        var darknet_model ="";
        var darknet_image = "";
        var component_params ="";
        if ($("#" + component_list[i]).find(".darknet-option").length) {
            if ($("#" + component_list[i]).find(".train-option").is(':checked')) {
                darknet_action = "train";
            } else if ($("#" + component_list[i]).find(".detect-option").is(':checked')) {
                darknet_action = "test";
            } else if ($("#" + component_list[i]).find(".eval-option").is(':checked')) {
                darknet_action = "map";
            } else {
                darknet_action_checked = false;
            }
            if (darknet_action_checked) {
                darknet_config = ' /mnt/' + $("#" + component_list[i]).find("#config-file-input").val();
                darknet_data = ' /mnt/' + $("#" + component_list[i]).find("#data-file-input").val();
                if ($("#" + component_list[i]).find("#model-file-input").val() != ""){
                    darknet_model = ' /mnt/' + $("#" + component_list[i]).find("#model-file-input").val();
                }
                if (darknet_action == "test" && $("#" + component_list[i]).find("#image-file-input").val() != "") {
                    darknet_image = ' /mnt/' + $("#" + component_list[i]).find("#image-file-input").val();
                }
                if (component_command != "") {
                    component_command += " && ";
                }
                component_command += "./darknet detector " + darknet_action + darknet_data + darknet_config + darknet_model;
                if (darknet_action == "test") {
                    component_command += darknet_image;
                }
                component_params = component_name + "_config='" + darknet_config + `',            
                ` + component_name + `_data='` + darknet_data + `',
                ` + component_name + `_model='` + darknet_model + `'`

            }
        }

        var to_be_eval = false;        
        var eval_model = "";
        var component_eval = "False";
        if ($("#" + component_list[i]).find(".check-modeldb").length) {
            if ($("#" + component_list[i]).find(".check-modeldb").is(':checked')) {
                to_be_eval = true;
                eval_model = darknet_config.replace('.cfg', '_final.weights');
                // if ($("#" + component_list[i]).find("#model-file-input").val() == "") {
                //     eval_model = darknet_config.replace('.cfg', '_final.weights');
                // }
                // else {
                //     eval_model = $("#" + component_list[i]).find("#model-file-input").val();
                // }
            }
        }

        // Checks if the image to use is a custom image instead of a standard one
        if (component_image == "Custom")
            component_image = $("#" + component_list[i]).find("#custom-image").val();

        // Gets the inputs for component
        var component_input_files = getComponentInputs();

        // Gets the outputs for component
        var { component_output, component_output_files } = getComponentOutputs();

        if (to_be_eval && darknet_action == 'map') {
        componentString +=
            `
    ` + component_name + `=eval_container(
        to_eval='` + component_name + `',
        step_name='` + component_name + `',
        eval_inputs=['` + darknet_config.trim() + `', '` + darknet_model.trim() + `', '` + darknet_data.trim() + `']
    )
`;
        } else {
        componentString +=
            `
    ` + component_name + `=new_container(
        step_name='` + component_name + `',
        step_image='` + component_image + `',
        step_command='` + component_command + `',
        step_outputs={` + component_output + `},
        output_to_local=[` + component_output_files + `],
        component_directory_location="%s" % storage_maker.outputs['` + component_name + `'],
        step_inputs=[` + component_input_files + `],
        to_be_eval=` + component_eval + `,
        num_gpu=` + num_gpu_to_use + `
    )
`;      }
        if (to_be_eval && darknet_action == 'train'){
        componentString +=
            `
    ` + `eval_`+component_name + `=eval_container(
        to_eval='` + component_name + `',
        step_name='eval_` + component_name + `',
        eval_inputs=["%s" % ` + component_name + `.outputs["darknet_config"], "%s" % ` + component_name + `.outputs["eval_model"], "%s" % ` + component_name + `.outputs["darknet_data"]]
    )
`;
        }        
        component_name_arr.push(component_name);
    }

    // Creates a directory for each component
    var { i, pipeline_directory_maker, pipeline_output_maker, pipeline_directory_location } = createComponentDirectory();

    return { pipeline_directory_maker, pipeline_output_maker, pipeline_directory_location, componentString, component_params };

    function createComponentDirectory() {
        var pipeline_directory_maker = "";
        var pipeline_output_maker = "";
        var pipeline_directory_location = "";
        for (var i = 0; i < component_name_arr.length; i++) {
            pipeline_directory_maker += ("mkdir /mnt/" + $("#pipeline-folder").val() + "/" + component_name_arr[i]);
            pipeline_output_maker += (`echo "/mnt/` + $("#pipeline-folder").val() + "/" + component_name_arr[i] + `" >> /` + component_name_arr[i] + `.txt`);
            pipeline_directory_location += (`'` + component_name_arr[i] + `': '/` + component_name_arr[i] + `.txt'`);
            if (i != component_name_arr.length - 1) {
                pipeline_directory_maker += " && ";
                pipeline_output_maker += " && ";
                pipeline_directory_location += ", ";
            }
        }
        return { i, pipeline_directory_maker, pipeline_output_maker, pipeline_directory_location };
    }    

    function getComponentInputs() {
        var component_input_files = "";
        $("#" + component_list[i]).find('.input-field').each(function () {
            if (!($(this).find("#component-input-from").val() == "" || $(this).find("#component-input-label").val() == "")) {
                component_input_files += `"%s" % ` + $(this).find("#component-input-from").val() + `.outputs["` + $(this).find("#component-input-label").val() + `"], `;
            }
        });
        component_input_files = component_input_files.substring(0, component_input_files.length - 2);
        return component_input_files;
    }

    function getComponentOutputs() {
        var component_output = "";
        var component_output_files = "";
        var output_index = 1;
        $("#" + component_list[i]).find('.output-field').each(function () {
            if (!($(this).find("#component-output-file").val() == "" || $(this).find("#component-output-label").val() == "")) {
                component_output_files += `'` + $(this).find("#component-output-file").val() + `',`;
                component_output += `'` + $(this).find("#component-output-label").val() + `': '/output` + (output_index++).toString() + `.txt', `;
            }
        });
        if (to_be_eval) {
            component_output_files += `'` + darknet_config + `',`;
            component_output_files += `'` + eval_model + `',`;
            component_output_files += `'` + darknet_data + `',`;
            component_output += `'darknet_config': '/output` + (output_index++).toString() + `.txt', `;
            component_output += `'eval_model': '/output` + (output_index++).toString() + `.txt', `;
            component_output += `'darknet_data': '/output` + (output_index++).toString() + `.txt', `;
            component_eval = 'True';
        }
        component_output_files = component_output_files.substring(0, component_output_files.length - 1);
        component_output = component_output.substring(0, component_output.length - 2);
        switch (component_image) {
            case "Darknet(No OpenCV)":
                component_image = DARKNET;
                break;
            case "Darknet(OpenCV)":
                component_image = DARKNET_OPENCV;
                break;
            case "Darknet-ModelDB(No OpenCV)":
                component_image = DARKNET_MODELDB;
                break;
        }
        return { component_output, component_output_files };
    }
}

// Adds additional pipeline component
function addComponent() {
    return function () {
        curr_component_num++;
        component_list.push(component_num);
        $("#component-column").append(`
        <div class="notification" id="` + component_num + `">
        <button class="delete" id="delete-button` + component_num + `"></button>
        <div class="field">
            <label class="label">Name of component</label>
            <div class="control">
                <input id="component-name" class="input compulsory-info" type="text" placeholder="Text input"/>
            </div>
        </div>
        <div class="field">
            <label class="label">Image to use</label>
            <div class="control">
                <div class="select">
                    <select class="compulsory-info component-image" id="component-image` + component_num + `">
                        <option>Select image</option>
                        <option>Darknet(No OpenCV)</option>
                        <option>Darknet(OpenCV)</option>
                        <option>Custom</option>
                    </select>
                </div>
            </div>
            <div class="control" id="darknet-options` + component_num + `">
            </div>
            <div class="control modeldb-component" id="modeldb-checkbox` + component_num + `">
            </div>
        </div>
        <div class="field" id="config-field` + component_num + `">
        </div>
        <div class="field">
            <label class="label">If 'Custom' image is selected</label>
            <div class="control">
            <input id="custom-image" class="input" type="text" placeholder="Text input"/>
            </div>
        </div>
        <div class="field">
            <label class="label">Number of GPUs to use</label>
            <div class="control">
            <input id="num-gpu-field" class="input" type="text" placeholder="Text input"/>
            </div>
        </div>
        <label class="label">Input of component 
            <a class="tag" id="add-input-button` + component_num + `"><i class="fas fa-plus"></i></a>
        </label>        

        <div id="input-component-field">
        </div>

        <div class="field">
            <label class="label">Command to run in container</label>
            <div class="control">
            <input id="component-command" class="input" type="text" placeholder="Text input"/>
            </div>
        </div>
        <label class="label">Output of component
            <a class="tag" id="add-output-button` + component_num + `"><i class="fas fa-plus"></i></a>
        </label>

        <div id="output-component-field">
        </div>        
        </div>
    `);
        $('#delete-button' + component_num).click(deleteComponent());
        $('#add-input-button' + component_num).click(addInput());
        $('#add-output-button' + component_num).click(addOutput());
        $('#component-image' + component_num).change(function () {
            var index = this.id.toString().substring(15, 16);
            $('#' + this.id + ' option:selected').each(function () {
                if (this.text.includes("Darknet(No OpenCV)")) {
                    $("#darknet-options" + index).empty().append(`
                        <input class="is-checkradio is-info is-rtl check-radio darknet-option train-option check-option` + index + `" id="train-button` + index + `" type="checkbox" name="exampleRtlCheckbox">
                        <label for="train-button` + index + `">Train</label>
                        <input class="is-checkradio is-info is-rtl check-radio darknet-option detect-option check-option` + index + `" id="detect-button` + index + `" type="checkbox" name="exampleRtlCheckbox">
                        <label for="detect-button` + index + `">Detect</label>
                        <input class="is-checkradio is-info is-rtl check-radio darknet-option eval-option check-option` + index + `" id="eval-button` + index + `" type="checkbox" name="exampleRtlCheckbox">
                        <label for="eval-button` + index + `">Evaluate</label>                        
                    `);
                    $('.check-option' + index).click(function () {                        
                        if (this.checked) {
                            var buttonClicked = this.id.split("-button")[0];
                            var indexOfButton = this.id.split("-button")[1];
                            var arrButton = ["train", "detect", "eval"];
                            arrButton.splice(arrButton.indexOf(buttonClicked), 1);
                            $("#"+arrButton[0]+"-button"+indexOfButton).prop("checked", false);
                            $("#"+arrButton[1]+"-button"+indexOfButton).prop("checked", false);
                            $('#config-field' + index).empty().append(`
                            <label class="label">Config File Path</label>
                            <div class="control">
                                <input id="config-file-input" class="input compulsory-info" type="text" placeholder="Text input"/>
                            </div>
                            <label class="label">Data File Path</label>
                            <div class="control">
                                <input id="data-file-input" class="input compulsory-info" type="text" placeholder="Text input"/>
                            </div>
                            <label class="label">Model File Path</label>
                            <div class="control">
                                <input id="model-file-input" class="input" type="text" placeholder="Text input"/>
                            </div>`);
                            if (buttonClicked == "detect") {
                                $('#config-field' + index).append(`
                                <label class="label">Image File Path</label>
                                <div class="control">
                                    <input id="image-file-input" class="input compulsory-info" type="text" placeholder="Text input"/>
                                </div>
                                `)
                            }
                            if (buttonClicked == "train" || buttonClicked == "eval") {
                                $("#modeldb-checkbox" + index).empty().append(`
                                <input class="is-checkradio is-info is-rtl check-modeldb check-radio` + index + `" id="modelDB-button` + index + `" type="checkbox" name="exampleRtlCheckbox">
                                <label for="modelDB-button` + index + `">Save to ModelDB?</label>                                                
                                `);
                            } else {
                                $("#modeldb-checkbox" + index).empty();
                            }
                        }
                        else {
                            $('#config-field' + index).empty();
                            $("#modeldb-checkbox" + index).empty();
                        }
                    });
                }
                else {
                    $("#darknet-options" + index).empty();
                    $('#config-field' + index).empty();
                    $("#modeldb-checkbox" + index).empty();
                }
            });
        });
        component_num++;
    };

    function addOutput() {
        return function () {
            $(this).closest('.notification').find('#output-component-field').append(`
            <div style="padding: 0px 40px 0px 0px; margin-right: -20px; margin-bottom: 15px" class="notification output-container">            
            <div class="field is-horizontal output-field">
                <div class="field-body">
                <div class="field">
                    <p class="control is-expanded">
                    <input id="component-output-label" class="input compulsory-info" type="text" placeholder="Label">
                    </p>
                </div>
                <div class="field">
                    <p class="control is-expanded">
                    <input id="component-output-file" class="input compulsory-info" type="text" placeholder="File">
                    </p>
                </div>                
                </div>
            </div>
            <button class="delete delete-output-button"></button>
            </div>            
            `);
            $('.delete-output-button').click(function () {
                $(this).closest('.output-container').remove();
            });
        };
    }

    function addInput() {
        return function () {
            $(this).closest('.notification').find('#input-component-field').append(`
            <div style="padding: 0px 40px 0px 0px; margin-right: -20px; margin-bottom: 15px" class="notification input-container">
                <div class="field is-horizontal input-field">
                    <div class="field-body">
                        <div class="field">
                            <p class="control is-expanded">
                            <input id="component-input-from" class="input compulsory-info" type="text" placeholder="From (Component)">
                            </p>
                        </div>
                        <div class="field">
                            <p class="control is-expanded">
                            <input id="component-input-label" class="input compulsory-info" type="text" placeholder="Label">
                            </p>
                        </div>            
                    </div>
                </div>
                <button class="delete delete-input-button"></button>
            </div>
            `);
            $('.delete-input-button').click(function () {
                $(this).closest('.input-container').remove();
            });
        };
    }

    function deleteComponent() {
        return function () {
            curr_component_num--;
            var index = $(this).closest('.notification').attr('id');
            arrayIndex = component_list.indexOf(parseInt(index));
            component_list.splice(arrayIndex, 1);
            $(this).closest('.notification').remove();
        };
    }
}

// Generates Pipeline code
function generatePipelineCode(pipeline_directory_maker, pipeline_output_maker, pipeline_directory_location, timestamp, componentString) {
    generated_code =
`<pre><code style="background-color: white;" id="code-block" class="python">import kfp.dsl as dsl
from kubernetes import client as k8s_client
import kfp.compiler as compiler
import kfp.components as comp
import kfp
import kfp.compiler as compiler

client = kfp.Client("` + $("#pipeline-hostname").val() + `")

pv_name='` + $("#pipeline-pv").val() + `'
pvc_name='` + $("#pipeline-pvc").val() + `'

def storage_maker_op(folder_name='',step_name='make-storage'):
    container = dsl.ContainerOp(
        name=step_name,
        image='alpine:latest',
        command = ['sh', '-c', ('mkdir /mnt/' + folder_name + ' && ` + pipeline_directory_maker + ` && ` + pipeline_output_maker + `')],
        file_outputs={` + pipeline_directory_location + `}
    )
    container.add_volume(
        k8s_client.V1Volume(name=pv_name, persistent_volume_claim=k8s_client.V1PersistentVolumeClaimVolumeSource(
            claim_name=pvc_name)))
    container.add_volume_mount(k8s_client.V1VolumeMount(mount_path='/mnt', name=pv_name))
    return container

def new_container(step_name, step_image, step_command=None, step_arguments=None, step_outputs=None, output_to_local=[], component_directory_location='', step_inputs=[], to_be_eval=False, num_gpu=0):
    cp_input_command = 'COMP_DIR=' + component_directory_location  + ' && echo "Starting component: ' + step_name + '..."'
    if (len(step_inputs)!=0):
        for input in step_inputs:
            cp_input_command += ' && cp ' + input + ' .'
    if (step_command != ""):
        step_command = cp_input_command + ' && ' + step_command
    else:
        step_command = cp_input_command
    num_output = len(output_to_local)
    if (num_output!=0):
        for index, output in enumerate(output_to_local):
            if (num_output - index <= 3 and to_be_eval is True):
                step_command = step_command + ' && find /mnt -iname "' + output + '" -exec cp {} $COMP_DIR \\;'
            else:
                step_command = step_command + ' && find -iname "' + output + '" -exec cp {} $COMP_DIR \\;'
            step_command = step_command + ' && echo "' + component_directory_location + '/' + output + '" >> /output' + str(index+1) + '.txt'
    container = dsl.ContainerOp(
        name=step_name,
        image=step_image,
        command=['sh', '-c', (step_command)],
        arguments=step_arguments,
        file_outputs=step_outputs
      )
    container.add_volume(
        k8s_client.V1Volume(name=pv_name, persistent_volume_claim=k8s_client.V1PersistentVolumeClaimVolumeSource(
            claim_name=pvc_name)))
    container.add_volume_mount(k8s_client.V1VolumeMount(mount_path='/mnt', name=pv_name))
    if (num_gpu!=0):
        container.set_gpu_limit(num_gpu)    
    return container

def eval_container(to_eval, step_name, eval_inputs=None):
    modelDB_IP = '` + $("#modeldb-hostname").val() + `'
    config_path = eval_inputs[0]
    model_path = eval_inputs[1]
    data_path = eval_inputs[2]
    step_command = 'echo "Evaluating component: ' + to_eval + ' using config path: ' + config_path + ', model path: ' + model_path + ', data path: ' + data_path + '..."'
    step_command += ' && CFGPATH=' + config_path + ' && WTPATH=' + model_path + ' && DATAPATH=' + data_path + ' && MDBHOST=' + modelDB_IP + ' && export CFGPATH WTPATH DATAPATH MDBHOST && ./list_darknet.sh'
    container = dsl.ContainerOp(
        name=step_name,
        image='alim95/darknet-test:modeldb-v4.1',
        command=['sh', '-c', (step_command)]
      )
    container.add_volume(
        k8s_client.V1Volume(name=pv_name, persistent_volume_claim=k8s_client.V1PersistentVolumeClaimVolumeSource(
            claim_name=pvc_name)))
    container.add_volume_mount(k8s_client.V1VolumeMount(mount_path='/mnt', name=pv_name))
    return container

@dsl.pipeline(
    name='` + $("#pipeline-name").val() + `',
    description='` + $("#pipeline-description").val() + `'
)

def pipeline` + timestamp + `(
        project='darknet-train',
        model='darknet-test/yolov3.weights',
        train_output='/darknet/predictions.jpg'):

    tf_server_name = 'pipeline` + timestamp + `-{{workflow.name}}'

    storage_maker = storage_maker_op(folder_name='` + $("#pipeline-folder").val() + `')
`
        +
        componentString
        +
        `
pipeline_func = pipeline` + timestamp + `
pipeline_filename = pipeline_func.__name__ + '.pipeline.tar.gz'
compiler.Compiler().compile(pipeline_func, pipeline_filename)
experiment = client.create_experiment("` + $("#pipeline-name").val() + `")
run_name = pipeline_func.__name__ + ' run'
run_result = client.run_pipeline(experiment.id, run_name, pipeline_filename)
</code>
</pre>
    `;
}

// Displays Pipeline diagram *WORK IN PROGRESS*
function showPipelineDiagram() {
    return function () {
        $(this).addClass("is-active");
        $('#code-tab').removeClass("is-active");
        $("#generated-pipeline").empty();
    };
}

// Displays Pipeline code
function showPipelineCode() {
    return function () {
        $(this).addClass("is-active");
        $('#diagram-tab').removeClass("is-active");
        $("#generated-pipeline").empty().append(generated_code);
        hljs.initHighlighting.called = false;
        hljs.initHighlighting();
    };
}

// Copy Pipeline code to clipboard automatically
function copyPipelineCodeText() {
    return function () {
        try {
            copyFunction();
            $("#copy-text-button").notify("Copied!", { className: "success", position: "top center", autoHideDelay: 1000, showDuration: 200 });
        }
        catch {
            $("#copy-text-button").notify("Error!", { position: "top center", autoHideDelay: 1000, showDuration: 200 });
        }
    };
}

function copyFunction() {
    const copyText = document.getElementById("code-block").textContent;
    const textArea = document.createElement('textarea');
    textArea.textContent = copyText;
    document.body.append(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
}
