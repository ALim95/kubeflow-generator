import kfp.dsl as dsl
from kubernetes import client as k8s_client
import kfp.compiler as compiler
import kfp.components as comp
import kfp
import kfp.compiler as compiler

client = kfp.Client()

pv_name='pipline-nfs'
pvc_name='pipeline-pvc'

def storage_maker_op(folder_name='',step_name='make-storage'):
    container = dsl.ContainerOp(
        name=step_name,
        image='alpine:latest',
        command = ['sh', '-c', ('mkdir /mnt/' + folder_name + ' && mkdir /mnt/test_doo123211/comp1 && mkdir /mnt/test_doo123211/comp2 && echo "/mnt/test_doo123211/comp1" >> /comp1.txt && echo "/mnt/test_doo123211/comp2" >> /comp2.txt')],
        file_outputs={'comp1': '/comp1.txt', 'comp2': '/comp2.txt'}
    )
    container.add_volume(
        k8s_client.V1Volume(name=pv_name, persistent_volume_claim=k8s_client.V1PersistentVolumeClaimVolumeSource(
            claim_name=pvc_name)))
    container.add_volume_mount(k8s_client.V1VolumeMount(mount_path='/mnt', name=pv_name))
    return container

def new_container(step_name, step_image, step_command=None, step_arguments=None, step_outputs=None, output_to_local=[], component_directory_location='', step_inputs=[], eval_inputs=None):
    cp_input_command = 'COMP_DIR=' + component_directory_location  + ' && echo "Starting component: ' + step_name + '..."'
    if (len(step_inputs)!=0):
        for input in step_inputs:
            cp_input_command += ' && cp ' + input + ' .'
    if (step_command != ""):
        step_command = cp_input_command + ' && ' + step_command
    else:
        step_command = cp_input_command
    if (len(output_to_local)!=0):
        for index, output in enumerate(output_to_local):
            step_command = step_command + ' && find -iname "' + output + '" -exec cp {} $COMP_DIR \;'
            step_command = step_command + ' && find -iname "Makefile" -exec cp {} $COMP_DIR \;'
            step_command = step_command + ' && echo "' + component_directory_location + '/' + output + '" >> /output' + str(index+1) + '.txt'
            step_command = step_command + ' && printf "' + component_directory_location + '/Makefile" >> /output' + str(index+1) + '.txt'
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

def eval_container(step_name, eval_inputs=None):
    step_command = ''
    container = dsl.ContainerOp(
        name=step_name,
        image='alim95/darknet-test:modeldb-v2',
        command=['sh', '-c', (step_command)],
        arguments=step_arguments,
        file_outputs=step_outputs
      )
    container.add_volume(
        k8s_client.V1Volume(name=pv_name, persistent_volume_claim=k8s_client.V1PersistentVolumeClaimVolumeSource(
            claim_name=pvc_name)))
    container.add_volume_mount(k8s_client.V1VolumeMount(mount_path='/mnt', name=pv_name))
    return container

@dsl.pipeline(
    name='test',
    description='test desc'
)

def pipeline201956102425(
        project='darknet-train',
        model='darknet-test/yolov3.weights',
        train_output='/darknet/predictions.jpg'):

    tf_server_name = 'pipeline201956102425-{{workflow.name}}'

    storage_maker = storage_maker_op(folder_name='test_doo123211')

    comp1=new_container(
        step_name='comp1',
        step_image='alim95/darknet-test:v6',
        step_command='',
        step_outputs={'test1': '/output1.txt'},
        output_to_local=['text.txt'],
        component_directory_location="%s" % storage_maker.outputs['comp1'],
        step_inputs=[]
    )

    comp2=new_container(
        step_name='comp2',
        step_image='alim95/darknet-test:v6',
        step_command='ls',
        step_outputs={},
        output_to_local=[],
        component_directory_location="%s" % storage_maker.outputs['comp2'],
        step_inputs=["%s" % comp1.outputs["test1"]]
    )

pipeline_func = pipeline201956102425
pipeline_filename = pipeline_func.__name__ + '.pipeline.tar.gz'
compiler.Compiler().compile(pipeline_func, pipeline_filename)
experiment = client.create_experiment("test")
run_name = pipeline_func.__name__ + ' run'
run_result = client.run_pipeline(experiment.id, run_name, pipeline_filename)
