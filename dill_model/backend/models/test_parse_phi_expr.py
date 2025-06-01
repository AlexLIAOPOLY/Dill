import unittest
import numpy as np
from dill_model import parse_phi_expr as dill_parse
from enhanced_dill_model import parse_phi_expr as enhanced_parse
from car_model import parse_phi_expr as car_parse
import sys
sys.path.append('.')
from dill_model import parse_phi_expr as dill_parse
from enhanced_dill_model import parse_phi_expr as enhanced_parse
from car_model import parse_phi_expr as car_parse

def all_parsers():
    return [dill_parse, enhanced_parse, car_parse]

class TestParsePhiExpr(unittest.TestCase):
    def test_valid_expressions(self):
        for parser in all_parsers():
            self.assertAlmostEqual(parser('0', 0), 0)
            self.assertAlmostEqual(parser('pi', 0), np.pi)
            self.assertAlmostEqual(parser('sin(pi/2)', 0), 1)
            self.assertAlmostEqual(parser('cos(0)', 0), 1)
            self.assertAlmostEqual(parser('sin(t)', np.pi/2), 1, places=5)
            self.assertAlmostEqual(parser('sin(t)+cos(t)', 0), 1)
            self.assertAlmostEqual(parser('2*sin(t)', np.pi/2), 2)
            self.assertAlmostEqual(parser('sin(t)+2', 0), 2)
    def test_invalid_expressions(self):
        for parser in all_parsers():
            # 不允许的变量
            self.assertEqual(parser('os.system("ls")', 0), 0)
            self.assertEqual(parser('__import__("os")', 0), 0)
            self.assertEqual(parser('abs(t)', 1), 0)
            self.assertEqual(parser('t+unknown', 1), 0)
            self.assertEqual(parser('lambda x: x', 0), 0)
    def test_edge_cases(self):
        for parser in all_parsers():
            self.assertEqual(parser('', 0), 0)
            self.assertEqual(parser(None, 0), 0)
            self.assertEqual(parser('1/0', 0), 0)
            self.assertEqual(parser('sin', 0), 0)
if __name__ == '__main__':
    unittest.main() 