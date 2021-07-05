# Copyright 2020-2021 Huawei Technologies Co., Ltd
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ============================================================================
"""Define the utils."""
import enum
import re
import os
import struct
import tempfile
import time

import numpy as np

from mindinsight.datavisual.data_transform.graph import NodeTypeEnum
from mindinsight.debugger.proto.debug_grpc_pb2 import EventReply
from mindinsight.domain.graph.proto.ms_graph_pb2 import DataType

# translate the MindSpore type to numpy type.
NUMPY_TYPE_MAP = {
    'DT_BOOL': np.bool,

    'DT_INT8': np.int8,
    'DT_INT16': np.int16,
    'DT_INT32': np.int32,
    'DT_INT64': np.int64,

    'DT_UINT8': np.uint8,
    'DT_UINT16': np.uint16,
    'DT_UINT32': np.uint32,
    'DT_UINT64': np.uint64,

    'DT_FLOAT16': np.float16,
    'DT_FLOAT32': np.float32,
    'DT_FLOAT64': np.float64,

    'DT_STRING': np.str,
    'DT_TYPE': np.str
}

MS_VERSION = '1.0.x'
# The debugger need 2g memory space.
MAX_CACHE_SPACE = 2 * 1024 * 1024 * 1024
# The debugger need to cache 2 tensors.
MAX_SINGLE_TENSOR_CACHE = 1 * 1024 * 1024 * 1024


@enum.unique
class ReplyStates(enum.Enum):
    """Define the status of reply."""
    SUCCESS = 0
    FAILED = -1


@enum.unique
class ServerStatus(enum.Enum):
    """The status of debugger server."""
    PENDING = 'pending'  # no client session has been connected
    RECEIVE_GRAPH = 'receive graph'  # the client session has sent the graph
    WAITING = 'waiting'  # the client session is ready
    RUNNING = 'running'  # the client session is running a script
    MISMATCH = 'mismatch'  # the version of Mindspore and Mindinsight is not matched
    SENDING = 'sending'  # the request is in cache but not be sent to client


@enum.unique
class Streams(enum.Enum):
    """Define the enable streams to be deal with."""

    COMMAND = "command"
    DATA = "data"
    METADATA = "metadata"
    GRAPH = 'node'
    TENSOR = 'tensor'
    WATCHPOINT = 'watchpoint'
    WATCHPOINT_HIT = 'watchpoint_hit'
    DEVICE = 'device'


class RunLevel(enum.Enum):
    """Run Level enum, it depends on whether the program is executed node by node,
    step by step, or in recheck phase"""
    NODE = "node"
    STEP = "step"
    RECHECK = "recheck"


def get_ack_reply(state=0):
    """The the ack EventReply."""
    reply = EventReply()
    state_mapping = {
        0: EventReply.Status.OK,
        1: EventReply.Status.FAILED,
        2: EventReply.Status.PENDING
    }
    reply.status = state_mapping[state]

    return reply


def wrap_reply_response(error_code=None, error_message=None):
    """
    Wrap reply response.

    Args:
        error_code (str): Error code. Default: None.
        error_message (str): Error message. Default: None.

    Returns:
        str, serialized response.
    """
    if error_code is None:
        reply = {'state': ReplyStates.SUCCESS.value}
    else:
        reply = {
            'state': ReplyStates.FAILED.value,
            'error_code': error_code,
            'error_message': error_message
        }

    return reply


def create_view_event_from_tensor_basic_info(tensors_info):
    """
    Create view event reply according to tensor names.

    Args:
        tensors_info (list[TensorBasicInfo]): The list of TensorBasicInfo. Each element has keys:
            `full_name`, `node_type`, `iter`.

    Returns:
        EventReply, the event reply with view cmd.
    """
    view_event = get_ack_reply()
    for tensor_info in tensors_info:
        node_type = tensor_info.node_type
        if node_type == NodeTypeEnum.CONST.value:
            continue
        truncate_tag = node_type == NodeTypeEnum.PARAMETER.value
        tensor_name = tensor_info.full_name
        # create view command
        ms_tensor = view_event.view_cmd.tensors.add()
        ms_tensor.node_name, ms_tensor.slot = tensor_name.rsplit(':', 1)
        ms_tensor.truncate = truncate_tag
        ms_tensor.iter = tensor_info.iter

    return view_event


def is_scope_type(node_type):
    """Judge whether the type is scope type."""
    return node_type.endswith('scope')


def is_cst_type(node_type):
    """Judge whether the type is const type."""
    return node_type == NodeTypeEnum.CONST.value


def version_match(ms_version, mi_version):
    """Judge if the version of Mindinsight and Mindspore is matched."""
    if not ms_version:
        ms_version = MS_VERSION
    mi_major, mi_minor = mi_version.split('.')[:2]
    ms_major, ms_minor = ms_version.split('.')[:2]
    return mi_major == ms_major and mi_minor == ms_minor


@enum.unique
class DebuggerServerMode(enum.Enum):
    """Debugger Server Mode."""
    ONLINE = 'online'
    OFFLINE = 'offline'


class DumpSettings(enum.Enum):
    """Dump settings."""
    E2E_DUMP_SETTINGS = 'e2e_dump_settings'
    COMMON_DUMP_SETTINGS = 'common_dump_settings'
    ASYNC_DUMP_SETTINGS = 'async_dump_settings'


def is_valid_rank_dir_name(name):
    """Check if the name followed the rank directory format."""
    return bool(re.search(r'^rank_\d+$', name))


def load_tensor(load_info, step, request_iterator, cache_store, rank_id):
    """Load tensor to tmp file."""
    file_mode = 0o600
    dir_mode = 0o700
    if load_info.get('prev') == 'prev':
        step -= 1
    tensor_stream = cache_store.get_stream_handler(Streams.TENSOR).get_tensor_handler_by_rank_id(rank_id)
    temp_dir = tempfile.TemporaryDirectory(dir=tensor_stream.download_mgr.temp_base_dir)
    os.chmod(temp_dir.name, dir_mode)
    node_name, slot = load_info.get('tensor_name').rsplit(':', 1)
    _, node_name = node_name.rsplit('/', 1)
    # Carry 2 digit for timestamp to ensure remaining 12 digit after round method
    timestamp_carry = 100
    file_name = "{}.{}.0.0.{}.output.{}.NONE.npy".format(
        load_info.get('node_type'), node_name, round(time.time() * timestamp_carry), slot)
    file_path = os.path.join(temp_dir.name, file_name)
    tensor = next(request_iterator)
    header = _generate_npy_header(tensor)
    _write_tensor(file_path, header)
    os.chmod(file_path, file_mode)
    _write_tensor(file_path, tensor.tensor_content)
    for tensor in request_iterator:
        _write_tensor(file_path, tensor.tensor_content)
    tensor_info = {
        "tensor_name": load_info.get("tensor_name"),
        "graph_name": load_info.get("graph_name"),
        "step": step,
        "rank_id": rank_id
    }
    tensor_stream.download_mgr.add(file_name, file_path, temp_dir, **tensor_info)
    metadata = cache_store.get_stream_handler(Streams.METADATA).get(['step', 'state'])
    ret = {
        'tensor_file': True,
        'node_name': load_info.get("node_name")
    }
    ret.update(metadata)
    cache_store.put_data(ret)


def _generate_npy_header(tensor_proto):
    """Generate the header for npy file."""
    shape = tuple(tensor_proto.dims)
    if shape == (0,):
        shape = ()
    np_type = np.dtype(NUMPY_TYPE_MAP.get(DataType.Name(tensor_proto.data_type)))
    array_info = "{" + "'descr': {}, 'fortran_order': False, 'shape': {}".format(repr(np_type.str),
                                                                                 repr(shape)) + "}"
    array_info = array_info.encode('latin1')
    header_length = len(array_info) + 1
    # the length of npy header need to be divided by 64 exactly, so fill by b' '.
    padding_length = 64 - ((10 + header_length) % 64)
    header = b'\x93NUMPY' + bytes([1, 0]) + struct.pack('<H', header_length + padding_length) + \
             array_info + b' ' * padding_length + b'\n'
    return header


def _write_tensor(file_path, value):
    """Write into temp file."""
    with open(file_path, 'ab') as fb:
        fb.write(value)
