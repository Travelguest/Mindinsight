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

"""
Function:
    Test the various combinations based on ResNet50.
"""
import os
import pytest

from mindinsight.wizard.base.utility import load_network_maker

NETWORK_NAME = 'resnet50'


class TestResNet50:
    """Test ResNet50 Module."""

    @pytest.mark.level0
    @pytest.mark.env_single
    @pytest.mark.platform_x86_cpu
    @pytest.mark.platform_arm_ascend_training
    @pytest.mark.platform_x86_gpu_training
    @pytest.mark.platform_x86_ascend_training
    @pytest.mark.parametrize('params', [{
        'config': {'loss': 'SoftmaxCrossEntropyWithLogits',
                   'optimizer': 'Momentum',
                   'dataset': 'Cifar10'},
        'dataset_loader_name': 'Cifar10Dataset'
    }, {
        'config': {'loss': 'SoftmaxCrossEntropyWithLogits',
                   'optimizer': 'Adam',
                   'dataset': 'Cifar10'},
        'dataset_loader_name': 'Cifar10Dataset'
    }, {
        'config': {'loss': 'SoftmaxCrossEntropyWithLogits',
                   'optimizer': 'SGD',
                   'dataset': 'Cifar10'},
        'dataset_loader_name': 'Cifar10Dataset'
    }, {
        'config': {'loss': 'SoftmaxCrossEntropyWithLogits',
                   'optimizer': 'Momentum',
                   'dataset': 'ImageNet'},
        'dataset_loader_name': 'ImageFolderDataset'
    }, {
        'config': {'loss': 'SoftmaxCrossEntropyWithLogits',
                   'optimizer': 'Adam',
                   'dataset': 'ImageNet'},
        'dataset_loader_name': 'ImageFolderDataset'
    }, {
        'config': {'loss': 'SoftmaxCrossEntropyWithLogits',
                   'optimizer': 'SGD',
                   'dataset': 'ImageNet'},
        'dataset_loader_name': 'ImageFolderDataset'
    }])
    def test_combinations(self, params):
        """Do testing."""

        network_maker_name = NETWORK_NAME
        config = params['config']
        dataset_loader_name = params['dataset_loader_name']

        network_maker = load_network_maker(network_maker_name)
        network_maker.configure(config)

        self.source_files = network_maker.generate(**config)

        self.check_scripts()
        self.check_src(dataset_loader_name, config)
        self.check_train_eval_readme(config['dataset'], config['loss'], config['optimizer'])

    def check_src(self, dataset_name, config):
        """Check src file."""
        dataset_is_right = False
        config_dataset_is_right = False
        config_optimizer_is_right = False
        network_is_right = False
        cross_entorpy_smooth_is_right = False
        generator_lr_is_right = False
        for source_file in self.source_files:
            if source_file.file_relative_path == os.path.normpath('src/dataset.py'):
                if dataset_name in source_file.content:
                    dataset_is_right = True
            if source_file.file_relative_path == os.path.join('src', NETWORK_NAME.lower() + '.py'):
                network_is_right = True
            if source_file.file_relative_path == os.path.normpath('src/CrossEntropySmooth.py'):
                cross_entorpy_smooth_is_right = True
            if source_file.file_relative_path == os.path.normpath('src/lr_generator.py'):
                generator_lr_is_right = True
            if source_file.file_relative_path == os.path.normpath('src/config.py'):
                content = source_file.content

                config_dataset_is_right = self._check_config_dataset(config, content)
                config_optimizer_is_right = self._check_config_optimizer(config, content)

        assert dataset_is_right
        assert config_dataset_is_right
        assert config_optimizer_is_right
        assert network_is_right
        assert cross_entorpy_smooth_is_right
        assert generator_lr_is_right

    @staticmethod
    def _check_config_dataset(config, content):
        """Check dataset in config."""
        config_dataset_is_right = False
        if config['dataset'] == 'Cifar10':
            if "'num_classes': 10" in content \
                    and "'warmup_epochs': 5" in content \
                    and "'lr_decay_mode': 'poly'" in content:
                config_dataset_is_right = True
        elif config['dataset'] == 'ImageNet':
            if "'num_classes': 1001" in content \
                    and "'warmup_epochs': 0" in content \
                    and "'lr_decay_mode': 'cosine'":
                config_dataset_is_right = True
        return config_dataset_is_right

    @staticmethod
    def _check_config_optimizer(config, content):
        """Check optimizer in config."""
        config_optimizer_is_right = False
        if config['optimizer'] == 'Momentum':
            if "'lr': 0.01" in content and \
                    "'momentum': 0.9" in content:
                config_optimizer_is_right = True
        elif config['optimizer'] == 'SGD':
            if "'lr': 0.01" in content:
                config_optimizer_is_right = True
        else:
            if "'lr': 0.001" in content:
                config_optimizer_is_right = True
        return config_optimizer_is_right

    def check_train_eval_readme(self, dataset_name, loss_name, optimizer_name):
        """Check train and eval."""

        train_is_right = False
        eval_is_right = False
        readme_is_right = False
        for source_file in self.source_files:
            if source_file.file_relative_path == 'train.py':
                content = source_file.content
                if 'resnet50' in content and optimizer_name in content:
                    if dataset_name == 'ImageNet' and loss_name == 'SoftmaxCrossEntropyWithLogits' \
                            and 'loss = CrossEntropySmooth' in content:
                        train_is_right = True
                    elif loss_name in content:
                        train_is_right = True

            if source_file.file_relative_path == 'eval.py':
                content = source_file.content
                if 'resnet50' in content:
                    if dataset_name == 'ImageNet' and loss_name == 'SoftmaxCrossEntropyWithLogits' \
                            and 'loss = CrossEntropySmooth' in content:
                        eval_is_right = True
                    elif loss_name in content:
                        eval_is_right = True

            if source_file.file_relative_path == 'README.md':
                content = source_file.content
                if 'ResNet50' in content and dataset_name in content:
                    readme_is_right = True
        assert train_is_right
        assert eval_is_right
        assert readme_is_right

    def check_scripts(self):
        """Check scripts."""

        exist_run_distribute_train = False
        exist_run_distribute_train_gpu = False
        exist_run_eval = False
        exist_run_eval_gpu = False
        exist_run_standalone_train = False
        exist_run_standalone_train_gpu = False

        for source_file in self.source_files:
            if source_file.file_relative_path == os.path.normpath('scripts/run_distribute_train.sh'):
                exist_run_distribute_train = True
            if source_file.file_relative_path == os.path.normpath('scripts/run_distribute_train_gpu.sh'):
                exist_run_distribute_train_gpu = True
            if source_file.file_relative_path == os.path.normpath('scripts/run_eval.sh'):
                exist_run_eval = True
            if source_file.file_relative_path == os.path.normpath('scripts/run_eval_gpu.sh'):
                exist_run_eval_gpu = True
            if source_file.file_relative_path == os.path.normpath('scripts/run_standalone_train.sh'):
                exist_run_standalone_train = True
            if source_file.file_relative_path == os.path.normpath('scripts/run_standalone_train_gpu.sh'):
                exist_run_standalone_train_gpu = True

        assert exist_run_distribute_train
        assert exist_run_distribute_train_gpu
        assert exist_run_eval
        assert exist_run_eval_gpu
        assert exist_run_standalone_train
        assert exist_run_standalone_train_gpu
