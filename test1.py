import kfp.dsl as dsl
from kubernetes import client as k8s_client
import kfp.compiler as compiler
import kfp.components as comp
import kfp
import kfp.compiler as compiler

client = kfp.Client(host="http://10.105.31.115/pipeline")

pv_name='pipeline-nfs'
pvc_name='pipeline-pvc'

def storage_maker_op(folder_name='',step_name='make-storage'):
    container = dsl.ContainerOp(
        name=step_name,
        image='alpine:latest',
        command = ['sh', '-c', ('mkdir /mnt/' + folder_name + ' && mkdir /mnt/test_doo0123o/comp1 && mkdir /mnt/test_doo0123o/component2 && echo "/mnt/test_doo0123o/comp1" >> /comp1.txt && echo "/mnt/test_doo0123o/component2" >> /component2.txt')],
        file_outputs={'comp1': '/comp1.txt', 'component2': '/component2.txt'}
    )
    container.add_volume(
        k8s_client.V1Volume(name=pv_name, persistent_volume_claim=k8s_client.V1PersistentVolumeClaimVolumeSource(
            claim_name=pvc_name)))
    container.add_volume_mount(k8s_client.V1VolumeMount(mount_path='/mnt', name=pv_name))
    return container

def new_container(step_name, step_image, step_command=None, step_arguments=None, step_outputs=None, output_to_local=[], component_directory_location='', step_inputs=[], to_be_eval=False):
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
                step_command = step_command + ' && find /mnt -iname "' + output + '" -exec cp {} $COMP_DIR \;'
            else:
                step_command = step_command + ' && find -iname "' + output + '" -exec cp {} $COMP_DIR \;'
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
    return container

def eval_container(to_eval, step_name, eval_inputs=None):
    config_path = eval_inputs[0]
    weights_path = eval_inputs[1]
    data_path = eval_inputs[2]
    step_command = 'echo "Evaluating component: ' + to_eval + ' using config path: ' + config_path + ', weights path: ' + weights_path + ', data path: ' + data_path + '..."'
    step_command += ' && CFGPATH=' + config_path + ' && WTPATH=' + weights_path + ' && DATAPATH=' + data_path + ' && export CFGPATH WTPATH DATAPATH && ./list_darknet.sh'
    container = dsl.ContainerOp(
        name=step_name,
        image='alim95/darknet-test:modeldb-v3',
        command=['sh', '-c', (step_command)]
      )
    container.add_volume(
        k8s_client.V1Volume(name=pv_name, persistent_volume_claim=k8s_client.V1PersistentVolumeClaimVolumeSource(
            claim_name=pvc_name)))
    container.add_volume_mount(k8s_client.V1VolumeMount(mount_path='/mnt', name=pv_name))
    return container

@dsl.pipeline(
    name='test_pipeline',
    description='test_desc'
)

def pipeline201956164439(
        project='darknet-train',
        model='darknet-test/yolov3.weights',
        train_output='/darknet/predictions.jpg'):

    tf_server_name = 'pipeline201956164439-{{workflow.name}}'

    storage_maker = storage_maker_op(folder_name='test_doo0123o')

    comp1=new_container(
        step_name='comp1',
        step_image='alim95/darknet-test:v6',
        step_command='',
        step_outputs={'text': '/output1.txt', 'eval_config': '/output2.txt', 'eval_weights': '/output3.txt', 'eval_data': '/output4.txt'},
        output_to_local=['text.txt','yolov3-voc.cfg','*.backup','voc.data'],
        component_directory_location="%s" % storage_maker.outputs['comp1'],
        step_inputs=[],
        to_be_eval=True
    )

    eval_comp1=eval_container(
        to_eval='comp1',
        step_name='eval_comp1',
        eval_inputs=["%s" % comp1.outputs["eval_config"], "%s" % comp1.outputs["eval_weights"], "%s" % comp1.outputs["eval_data"]]
    )

    component2=new_container(
        step_name='component2',
        step_image='alim95/darknet-test:v6',
        step_command='ls',
        step_outputs={},
        output_to_local=[],
        component_directory_location="%s" % storage_maker.outputs['component2'],
        step_inputs=["%s" % comp1.outputs["text"]],
        to_be_eval=False
    )

pipeline_func = pipeline201956164439
pipeline_filename = pipeline_func.__name__ + '.pipeline.tar.gz'
compiler.Compiler().compile(pipeline_func, pipeline_filename)
experiment = client.create_experiment("test_pipeline")
run_name = pipeline_func.__name__ + ' run'
run_result = client.run_pipeline(experiment.id, run_name, pipeline_filename)
