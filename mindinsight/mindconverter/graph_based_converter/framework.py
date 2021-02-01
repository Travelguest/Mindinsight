# Copyright 2020-2021 Huawei Technologies Co., Ltd.All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================
"""Graph based scripts converter workflow."""
import os
import argparse
import sys
from importlib import import_module
from importlib.util import find_spec

import mindinsight
from mindinsight.mindconverter.graph_based_converter.common.global_context import GlobalContext
from mindinsight.mindconverter.graph_based_converter.common.utils import lib_version_satisfied, onnx_satisfied, \
    save_code_file_and_report, get_framework_type, get_third_part_lib_validation_error_info
from mindinsight.mindconverter.graph_based_converter.constant import FrameworkType, \
    ONNX_MIN_VER, TF2ONNX_MIN_VER, ONNXRUNTIME_MIN_VER, ONNXOPTIMIZER_MIN_VER, ONNXOPTIMIZER_MAX_VER
from mindinsight.mindconverter.graph_based_converter.generator import batch_add_nodes
from mindinsight.mindconverter.graph_based_converter.mapper import ONNXToMindSporeMapper
from mindinsight.mindconverter.common.log import logger as log, logger_console as log_console
from mindinsight.mindconverter.common.exceptions import GraphInitError, TreeCreationError, SourceFilesSaveError, \
    BaseConverterError, UnknownModelError, GeneratorError, TfRuntimeError, RuntimeIntegrityError, ParamMissingError
from mindinsight.mindconverter.graph_based_converter.third_party_graph import GraphFactory

permissions = os.R_OK | os.W_OK | os.X_OK
os.umask(permissions << 3 | permissions)

parser = argparse.ArgumentParser(
    prog="MindConverter",
    description="Graph based MindConverter CLI entry point (version: {})".format(
        mindinsight.__version__)
)

parser.add_argument("--graph", type=str, required=True,
                    help="Third party framework's graph path.")
parser.add_argument("--sample_shape", nargs='+', type=int, required=True,
                    help="Input shape of the model.")
parser.add_argument("--ckpt", type=str, required=False,
                    help="Third party framework's checkpoint path.")
parser.add_argument("--output", type=str, required=True,
                    help="Generated scripts output folder path.")
parser.add_argument("--report", type=str, required=False,
                    help="Generated reports output folder path.")


def onnx_lib_version_satisfied():
    """Check onnx libs version whether is satisfied."""
    onnx = import_module("onnx")
    ort = import_module("onnxruntime")
    optimizer = import_module("onnxoptimizer.version")
    if not lib_version_satisfied(getattr(onnx, "__version__"), ONNX_MIN_VER) \
            or not lib_version_satisfied(getattr(ort, "__version__"), ONNXRUNTIME_MIN_VER) \
            or not lib_version_satisfied(getattr(optimizer, "version"), ONNXOPTIMIZER_MIN_VER, ONNXOPTIMIZER_MAX_VER):
        return False
    return True


def torch_installation_validation(func):
    """
    Validate args of func.

    Args:
        func (type): Function.

    Returns:
        type, inner function.
    """

    def _f(graph_path: str, sample_shape: tuple,
           input_nodes: str, output_nodes: str,
           output_folder: str, report_folder: str = None):
        # Check whether pytorch is installed.
        error_info = None
        if graph_path.endswith('.onnx'):
            if not onnx_satisfied():
                error_info = f"{get_third_part_lib_validation_error_info(['onnx', 'onnxruntime', 'onnxoptimizer'])} " \
                             f"are required when using graph based scripts converter."
        else:
            if not find_spec("torch") or not onnx_satisfied():
                error_info = f"PyTorch, " \
                             f"{get_third_part_lib_validation_error_info(['onnx', 'onnxruntime', 'onnxoptimizer'])} " \
                             f"are required when using graph based scripts converter, and PyTorch version must " \
                             f"be consisted with model generation runtime."
        if error_info:
            error = RuntimeIntegrityError(error_info)
            log.error(error)
            log_console.error("\n")
            log_console.error(str(error))
            log_console.error("\n")
            sys.exit(0)

        if not onnx_lib_version_satisfied():
            error = RuntimeIntegrityError(
                f"{get_third_part_lib_validation_error_info(['onnx', 'onnxruntime', 'onnxoptimizer'])} "
                f"are required when using graph based scripts converter."
            )
            log.error(error)
            log_console.error("\n")
            log_console.error(str(error))
            log_console.error("\n")
            sys.exit(0)

        func(graph_path=graph_path, sample_shape=sample_shape,
             input_nodes=input_nodes, output_nodes=output_nodes,
             output_folder=output_folder, report_folder=report_folder)

    return _f


def _check_tf_installation():
    """
    Check whether TensorFlow was installed.

    Returns:
        bool, true or false.
    """
    return find_spec("tensorflow") or find_spec("tensorflow-gpu")


def tf_installation_validation(func):
    """
    Validate args of func.

    Args:
        func(type): Function.

    Returns:
        type, inner function.
    """

    def _f(graph_path: str, sample_shape: tuple,
           output_folder: str, report_folder: str = None,
           input_nodes: str = None, output_nodes: str = None):
        # Check whether tensorflow is installed.
        if not _check_tf_installation() or not onnx_satisfied():
            error = RuntimeIntegrityError(
                f"TensorFlow, "
                f"{get_third_part_lib_validation_error_info(['tf2onnx', 'onnx', 'onnxruntime', 'onnxoptimizer'])} "
                f"are required when using graph based scripts converter for TensorFlow conversion."
            )
            log.error(error)
            log_console.error("\n")
            log_console.error(str(error))
            log_console.error("\n")
            sys.exit(0)

        tf2onnx = import_module("tf2onnx")

        if not lib_version_satisfied(getattr(tf2onnx, "__version__"), TF2ONNX_MIN_VER) \
                or not onnx_lib_version_satisfied():
            error = RuntimeIntegrityError(
                f"TensorFlow, "
                f"{get_third_part_lib_validation_error_info(['tf2onnx', 'onnx', 'onnxruntime', 'onnxoptimizer'])} "
                f"are required when using graph based scripts converter for TensorFlow conversion."
            )
            log.error(error)
            log_console.error("\n")
            log_console.error(str(error))
            log_console.error("\n")
            sys.exit(0)

        func(graph_path=graph_path, sample_shape=sample_shape,
             output_folder=output_folder, report_folder=report_folder,
             input_nodes=input_nodes, output_nodes=output_nodes)

    return _f


def _extract_model_name(model_path):
    """
    Extract model name from model path.

    Args:
        model_path(str): Path of Converted model.

    Returns:
        str: Name of Converted model.
    """

    base_path = os.path.basename(model_path)
    model_name = '.'.join(base_path.split('.')[:-1])
    return model_name


@torch_installation_validation
@GraphInitError.uniform_catcher()
@TreeCreationError.uniform_catcher()
@SourceFilesSaveError.uniform_catcher()
@GeneratorError.uniform_catcher()
def graph_based_converter_pytorch_to_ms(graph_path: str, sample_shape: tuple,
                                        input_nodes: str, output_nodes: str,
                                        output_folder: str, report_folder: str = None):
    """
    PyTorch to MindSpore based on Graph.

    Args:
        graph_path (str): Graph file path.
        sample_shape (tuple): Input shape of the model.
        input_nodes (str): Input node(s) of the model.
        output_nodes (str): Output node(s) of the model.
        output_folder (str): Output folder.
        report_folder (str): Report output folder path.
    """
    graph_obj = GraphFactory.init(graph_path, sample_shape=sample_shape,
                                  input_nodes=input_nodes, output_nodes=output_nodes)
    generator_inst = batch_add_nodes(graph_obj, ONNXToMindSporeMapper)
    model_name = _extract_model_name(graph_path)
    code_fragments = generator_inst.generate()
    save_code_file_and_report(model_name, code_fragments, output_folder, report_folder)
    # Release global context.
    GlobalContext.release()


@tf_installation_validation
@GraphInitError.uniform_catcher()
@TfRuntimeError.uniform_catcher()
@TreeCreationError.uniform_catcher()
@SourceFilesSaveError.uniform_catcher()
@GeneratorError.uniform_catcher()
def graph_based_converter_tf_to_ms(graph_path: str, sample_shape: tuple,
                                   input_nodes: str, output_nodes: str,
                                   output_folder: str, report_folder: str = None):
    """
    Tensorflow to MindSpore based on Graph.

    Args:
        graph_path(str): Graph file path.
        sample_shape(tuple): Input shape of the model.
        input_nodes(str): Input node(s) of the model.
        output_nodes(str): Output node(s) of the model.
        output_folder(str): Output folder.
        report_folder(str): Report output folder path.
    """

    # Close unnecessary log.
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

    graph_obj = GraphFactory.init(graph_path, sample_shape=sample_shape,
                                  input_nodes=input_nodes, output_nodes=output_nodes)
    generator_inst = batch_add_nodes(graph_obj, ONNXToMindSporeMapper)
    model_name = _extract_model_name(graph_path)
    code_fragments = generator_inst.generate()
    save_code_file_and_report(model_name, code_fragments, output_folder, report_folder)
    # Release global context.
    GlobalContext.release()


@BaseConverterError.uniform_catcher()
def main_graph_base_converter(file_config):
    """
    The entrance for converter, script files will be converted.

    Args:
        file_config (dict): The config of file which to convert.
    """
    graph_path = file_config['model_file']
    frame_type = get_framework_type(graph_path)
    if not file_config.get("shape"):
        raise ParamMissingError("Param missing, `--shape` is required when using graph mode.")

    if frame_type == FrameworkType.PYTORCH.value:
        graph_based_converter_pytorch_to_ms(graph_path=graph_path,
                                            sample_shape=file_config['shape'],
                                            input_nodes=file_config['input_nodes'] if file_config['input_nodes']
                                            else 'input.1',
                                            output_nodes=file_config['output_nodes'] if file_config['output_nodes']
                                            else '',
                                            output_folder=file_config['outfile_dir'],
                                            report_folder=file_config['report_dir'])
    elif frame_type == FrameworkType.TENSORFLOW.value:
        check_params = ['input_nodes', 'output_nodes']
        check_params_exist(check_params, file_config)
        graph_based_converter_tf_to_ms(graph_path=graph_path,
                                       sample_shape=file_config['shape'],
                                       input_nodes=file_config['input_nodes'],
                                       output_nodes=file_config['output_nodes'],
                                       output_folder=file_config['outfile_dir'],
                                       report_folder=file_config['report_dir'])
    else:
        error_msg = "Get UNSUPPORTED model."
        error = UnknownModelError(error_msg)
        raise error


def check_params_exist(params: list, config):
    """Check params exist."""
    miss_param_list = ''
    for param in params:
        if not config.get(param) or not config[param]:
            miss_param_list = ', '.join((miss_param_list, param)) if miss_param_list else param

    if miss_param_list:
        raise ParamMissingError(f"Param(s) missing, {miss_param_list} is(are) required when using graph mode.")
