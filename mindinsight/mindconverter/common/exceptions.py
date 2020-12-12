# Copyright 2019 Huawei Technologies Co., Ltd
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
"""Define custom exception."""
import abc
import sys
from enum import unique, Enum
from importlib import import_module

from lib2to3.pgen2 import parse
from treelib.exceptions import DuplicatedNodeIdError, MultipleRootError, NodeIDAbsentError

from mindinsight.mindconverter.common.log import logger as log, logger_console as log_console

from mindinsight.utils.constant import ScriptConverterErrors
from mindinsight.utils.exceptions import MindInsightException


@unique
class ConverterErrors(ScriptConverterErrors):
    """Converter error codes."""
    SCRIPT_NOT_SUPPORT = 1
    NODE_TYPE_NOT_SUPPORT = 2
    CODE_SYNTAX_ERROR = 3

    BASE_CONVERTER_FAIL = 000
    GRAPH_INIT_FAIL = 100
    TREE_CREATE_FAIL = 200
    SOURCE_FILES_SAVE_FAIL = 300
    GENERATOR_FAIL = 400
    SUB_GRAPH_SEARCHING_FAIL = 500


class ScriptNotSupport(MindInsightException):
    """The script can not support to process."""

    def __init__(self, msg):
        super(ScriptNotSupport, self).__init__(ConverterErrors.SCRIPT_NOT_SUPPORT,
                                               msg,
                                               http_code=400)


class NodeTypeNotSupport(MindInsightException):
    """The astNode can not support to process."""

    def __init__(self, msg):
        super(NodeTypeNotSupport, self).__init__(ConverterErrors.NODE_TYPE_NOT_SUPPORT,
                                                 msg,
                                                 http_code=400)


class CodeSyntaxError(MindInsightException):
    """The CodeSyntaxError class definition."""

    def __init__(self, msg):
        super(CodeSyntaxError, self).__init__(ConverterErrors.CODE_SYNTAX_ERROR,
                                              msg,
                                              http_code=400)


class MindConverterException(Exception):
    """MindConverter exception."""
    BASE_ERROR_CODE = None  # ConverterErrors.BASE_CONVERTER_FAIL.value
    # ERROR_CODE should be declared in child exception.
    ERROR_CODE = None

    def __init__(self, **kwargs):
        """Initialization of MindInsightException."""
        user_msg = kwargs.get('user_msg', '')

        if isinstance(user_msg, str):
            user_msg = ' '.join(user_msg.split())

        super(MindConverterException, self).__init__()
        self.user_msg = user_msg
        self.root_exception_error_code = None

    def __str__(self):
        return '[{}] code: {}, msg: {}'.format(self.__class__.__name__, self.error_code(), self.user_msg)

    def __repr__(self):
        return self.__str__()

    def error_code(self):
        """"
        Calculate error code.

        code compose(2bytes)
        error: 16bits.
        num = 0xFFFF & error
        error_cods

        Returns:
            str, Hex string representing the composed MindConverter error code.
        """
        if self.root_exception_error_code:
            return self.root_exception_error_code
        if self.BASE_ERROR_CODE is None or self.ERROR_CODE is None:
            raise ValueError("MindConverterException has not been initialized.")
        num = 0xFFFF & self.ERROR_CODE  # 0xFFFF & self.error.value
        error_code = f"{str(self.BASE_ERROR_CODE).zfill(3)}{hex(num)[2:].zfill(4).upper()}"
        return error_code

    @classmethod
    @abc.abstractmethod
    def raise_from(cls):
        """Raise from below exceptions."""

    @classmethod
    def uniform_catcher(cls, msg: str = ""):
        """Uniform exception catcher."""

        def decorator(func):
            def _f(*args, **kwargs):
                try:
                    res = func(*args, **kwargs)
                except cls.raise_from() as e:
                    error = cls() if not msg else cls(msg=msg)
                    detail_info = str(e)
                    log.error(error)
                    log_console.error("\n")
                    log_console.error(detail_info)
                    log_console.error("\n")
                    log.exception(e)
                    sys.exit(0)
                except ModuleNotFoundError as e:
                    detail_info = "Error detail: Required package not found, please check the runtime environment."
                    log_console.error("\n")
                    log_console.error(str(e))
                    log_console.error(detail_info)
                    log_console.error("\n")
                    log.exception(e)
                    sys.exit(0)
                return res

            return _f

        return decorator

    @classmethod
    def check_except(cls, msg):
        """Check except."""

        def decorator(func):
            def _f(*args, **kwargs):
                try:
                    output = func(*args, **kwargs)
                except cls.raise_from() as e:
                    error = cls(msg=msg)
                    error_code = e.error_code() if isinstance(e, MindConverterException) else None
                    error.root_exception_error_code = error_code
                    log.error(msg)
                    log.exception(e)
                    raise error
                except Exception as e:
                    log.error(msg)
                    log.exception(e)
                    raise e
                return output

            return _f

        return decorator


class BaseConverterError(MindConverterException):
    """Base converter failed."""

    @unique
    class ErrCode(Enum):
        """Define error code of BaseConverterError."""
        UNKNOWN_ERROR = 0
        UNKNOWN_MODEL = 1

    BASE_ERROR_CODE = ConverterErrors.BASE_CONVERTER_FAIL.value
    ERROR_CODE = ErrCode.UNKNOWN_ERROR.value
    DEFAULT_MSG = "Failed to start base converter."

    def __init__(self, msg=DEFAULT_MSG):
        super(BaseConverterError, self).__init__(user_msg=msg)

    @classmethod
    def raise_from(cls):
        """Raise from exceptions below."""
        except_source = Exception, cls
        return except_source


class UnknownModelError(BaseConverterError):
    """The unknown model error."""
    ERROR_CODE = BaseConverterError.ErrCode.UNKNOWN_MODEL.value

    def __init__(self, msg):
        super(UnknownModelError, self).__init__(msg=msg)

    @classmethod
    def raise_from(cls):
        return cls


class GraphInitError(MindConverterException):
    """The graph init fail error."""

    @unique
    class ErrCode(Enum):
        """Define error code of GraphInitError."""
        UNKNOWN_ERROR = 0
        MODEL_NOT_SUPPORT = 1
        TF_RUNTIME_ERROR = 2
        INPUT_SHAPE_ERROR = 3
        MI_RUNTIME_ERROR = 4

    BASE_ERROR_CODE = ConverterErrors.GRAPH_INIT_FAIL.value
    ERROR_CODE = ErrCode.UNKNOWN_ERROR.value
    DEFAULT_MSG = "Error occurred when init graph object."

    def __init__(self, msg=DEFAULT_MSG):
        super(GraphInitError, self).__init__(user_msg=msg)

    @classmethod
    def raise_from(cls):
        """Raise from exceptions below."""
        except_source = (FileNotFoundError,
                         ModuleNotFoundError,
                         ModelNotSupportError,
                         ModelLoadingError,
                         RuntimeIntegrityError,
                         TypeError,
                         ZeroDivisionError,
                         RuntimeError,
                         cls)
        return except_source


class TreeCreationError(MindConverterException):
    """The tree create fail."""

    @unique
    class ErrCode(Enum):
        """Define error code of TreeCreationError."""
        UNKNOWN_ERROR = 0
        NODE_INPUT_MISSING = 1
        TREE_NODE_INSERT_FAIL = 2

    BASE_ERROR_CODE = ConverterErrors.TREE_CREATE_FAIL.value
    ERROR_CODE = ErrCode.UNKNOWN_ERROR.value
    DEFAULT_MSG = "Error occurred when create hierarchical tree."

    def __init__(self, msg=DEFAULT_MSG):
        super(TreeCreationError, self).__init__(user_msg=msg)

    @classmethod
    def raise_from(cls):
        """Raise from exceptions below."""
        except_source = NodeInputMissingError, TreeNodeInsertError, cls
        return except_source


class SourceFilesSaveError(MindConverterException):
    """The source files save fail error."""

    @unique
    class ErrCode(Enum):
        """Define error code of SourceFilesSaveError."""
        UNKNOWN_ERROR = 0
        NODE_INPUT_TYPE_NOT_SUPPORT = 1
        SCRIPT_GENERATE_FAIL = 2
        REPORT_GENERATE_FAIL = 3

    BASE_ERROR_CODE = ConverterErrors.SOURCE_FILES_SAVE_FAIL.value
    ERROR_CODE = ErrCode.UNKNOWN_ERROR.value
    DEFAULT_MSG = "Error occurred when save source files."

    def __init__(self, msg=DEFAULT_MSG):
        super(SourceFilesSaveError, self).__init__(user_msg=msg)

    @classmethod
    def raise_from(cls):
        """Raise from exceptions below."""
        except_source = (NodeInputTypeNotSupportError,
                         ScriptGenerationError,
                         ReportGenerationError,
                         IOError, cls)
        return except_source


class ModelNotSupportError(GraphInitError):
    """The model not support error."""

    ERROR_CODE = GraphInitError.ErrCode.MODEL_NOT_SUPPORT.value

    def __init__(self, msg):
        super(ModelNotSupportError, self).__init__(msg=msg)

    @classmethod
    def raise_from(cls):
        """Raise from exceptions below."""
        except_source = (RuntimeError,
                         ModuleNotFoundError,
                         ValueError,
                         AssertionError,
                         TypeError,
                         OSError,
                         ZeroDivisionError, cls)
        return except_source


class TfRuntimeError(GraphInitError):
    """Catch tf runtime error."""
    ERROR_CODE = GraphInitError.ErrCode.TF_RUNTIME_ERROR.value
    DEFAULT_MSG = "Error occurred when init graph, TensorFlow runtime error."

    def __init__(self, msg=DEFAULT_MSG):
        super(TfRuntimeError, self).__init__(msg=msg)

    @classmethod
    def raise_from(cls):
        tf_error_module = import_module('tensorflow.python.framework.errors_impl')
        tf_error = getattr(tf_error_module, 'OpError')
        return tf_error, ValueError, RuntimeError, cls


class RuntimeIntegrityError(GraphInitError):
    """Catch runtime error."""
    ERROR_CODE = GraphInitError.ErrCode.MI_RUNTIME_ERROR.value

    def __init__(self, msg):
        super(RuntimeIntegrityError, self).__init__(msg=msg)

    @classmethod
    def raise_from(cls):
        return RuntimeError, AttributeError, ImportError, ModuleNotFoundError, cls


class NodeInputMissingError(TreeCreationError):
    """The node input missing error."""
    ERROR_CODE = TreeCreationError.ErrCode.NODE_INPUT_MISSING.value

    def __init__(self, msg):
        super(NodeInputMissingError, self).__init__(msg=msg)

    @classmethod
    def raise_from(cls):
        return ValueError, IndexError, KeyError, AttributeError, cls


class TreeNodeInsertError(TreeCreationError):
    """The tree node create fail error."""
    ERROR_CODE = TreeCreationError.ErrCode.TREE_NODE_INSERT_FAIL.value

    def __init__(self, msg):
        super(TreeNodeInsertError, self).__init__(msg=msg)

    @classmethod
    def raise_from(cls):
        """Raise from exceptions below."""
        except_source = (OSError,
                         DuplicatedNodeIdError,
                         MultipleRootError,
                         NodeIDAbsentError, cls)
        return except_source


class NodeInputTypeNotSupportError(SourceFilesSaveError):
    """The node input type NOT support error."""
    ERROR_CODE = SourceFilesSaveError.ErrCode.NODE_INPUT_TYPE_NOT_SUPPORT.value

    def __init__(self, msg):
        super(NodeInputTypeNotSupportError, self).__init__(msg=msg)

    @classmethod
    def raise_from(cls):
        return ValueError, TypeError, IndexError, cls


class ScriptGenerationError(SourceFilesSaveError):
    """The script generate fail error."""
    ERROR_CODE = SourceFilesSaveError.ErrCode.SCRIPT_GENERATE_FAIL.value

    def __init__(self, msg):
        super(ScriptGenerationError, self).__init__(msg=msg)

    @classmethod
    def raise_from(cls):
        """Raise from exceptions below."""
        except_source = (RuntimeError,
                         parse.ParseError,
                         AttributeError, cls)
        return except_source


class ReportGenerationError(SourceFilesSaveError):
    """The report generate fail error."""
    ERROR_CODE = SourceFilesSaveError.ErrCode.REPORT_GENERATE_FAIL.value

    def __init__(self, msg):
        super(ReportGenerationError, self).__init__(msg=msg)

    @classmethod
    def raise_from(cls):
        """Raise from exceptions below."""
        return ZeroDivisionError, cls


class SubGraphSearchingError(MindConverterException):
    """Sub-graph searching exception."""

    @unique
    class ErrCode(Enum):
        """Define error code of SourceFilesSaveError."""
        BASE_ERROR = 0
        CANNOT_FIND_VALID_PATTERN = 1
        MODEL_NOT_SUPPORT = 2

    BASE_ERROR_CODE = ConverterErrors.SUB_GRAPH_SEARCHING_FAIL.value
    ERROR_CODE = ErrCode.BASE_ERROR.value
    DEFAULT_MSG = "Sub-Graph pattern searching fail."

    def __init__(self, msg=DEFAULT_MSG):
        super(SubGraphSearchingError, self).__init__(user_msg=msg)

    @classmethod
    def raise_from(cls):
        """Define exception in sub-graph searching module."""
        return IndexError, KeyError, ValueError, AttributeError, ZeroDivisionError, cls


class GeneratorError(MindConverterException):
    """The Generator fail error."""

    @unique
    class ErrCode(Enum):
        """Define error code of SourceFilesSaveError."""
        BASE_ERROR = 0
        STATEMENT_GENERATION_ERROR = 1
        CONVERTED_OPERATOR_LOADING_ERROR = 2

    BASE_ERROR_CODE = ConverterErrors.GENERATOR_FAIL.value
    ERROR_CODE = ErrCode.BASE_ERROR.value
    DEFAULT_MSG = "Error occurred when generate code."

    def __init__(self, msg=DEFAULT_MSG):
        super(GeneratorError, self).__init__(user_msg=msg)

    @classmethod
    def raise_from(cls):
        """Raise from exceptions below."""
        except_source = (ValueError, TypeError, cls)
        return except_source


class ModelLoadingError(GraphInitError):
    """Model loading fail."""
    ERROR_CODE = GraphInitError.ErrCode.INPUT_SHAPE_ERROR.value

    def __init__(self, msg):
        super(ModelLoadingError, self).__init__(msg=msg)

    @classmethod
    def raise_from(cls):
        """Define exception when model loading fail."""
        return ValueError, cls
