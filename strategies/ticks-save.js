<xml xmlns="http://www.w3.org/1999/xhtml" collection="false">
  <block type="trade_definition" id="trade_def" x="0" y="0">
    <value name="TRADETYPE">
      <shadow type="text">
        <field name="TEXT">call</field>
      </shadow>
    </value>
    <value name="MARKET">
      <shadow type="text">
        <field name="TEXT">R_100</field>
      </shadow>
    </value>
    <value name="CANDLEINTERVAL">
      <shadow type="text">
        <field name="TEXT">1m</field>
      </shadow>
    </value>
    <value name="RESTARTBUYSELL">
      <shadow type="math_number">
        <field name="NUM">1</field>
      </shadow>
    </value>
    <value name="RESTARTONERROR">
      <shadow type="math_number">
        <field name="NUM">1</field>
      </shadow>
    </value>
  </block>
  
  <block type="before_purchase" id="strategy" x="0" y="220">
    <statement name="statement">
      <block type="purchase" id="purchase_call">
        <value name="BET">
          <shadow type="math_number">
            <field name="NUM">1</field>
          </shadow>
        </value>
      </block>
    </statement>
  </block>
  
  <block type="during_purchase" id="during_purch" x="0" y="420"></block>
  
  <block type="after_purchase" id="after_purch" x="0" y="620">
    <statement name="statement">
      <block type="controls_if" id="win_check">
        <value name="IF0">
          <block type="check_result" id="check_win">
            <field name="CHECK_RESULT">win</field>
          </block>
        </value>
        <statement name="DO0">
          <block type="variables_set" id="set_stake">
            <field name="VAR" id="stake_var">stake</field>
            <value name="VALUE">
              <block type="math_arithmetic" id="multiply_stake">
                <field name="OP">MULTIPLY</field>
                <value name="A">
                  <block type="variables_get" id="get_stake">
                    <field name="VAR" id="stake_var">stake</field>
                  </block>
                </value>
                <value name="B">
                  <shadow type="math_number">
                    <field name="NUM">2</field>
                  </shadow>
                </value>
              </block>
            </value>
            <next>
              <block type="math_change" id="increase_win_count">
                <field name="VAR" id="win_count">win_count</field>
                <value name="DELTA">
                  <shadow type="math_number">
                    <field name="NUM">1</field>
                  </shadow>
                </value>
                <next>
                  <block type="controls_if" id="reset_win_count">
                    <value name="IF0">
                      <block type="logic_compare" id="compare_win_count">
                        <field name="OP">EQ</field>
                        <value name="A">
                          <block type="variables_get" id="get_win_count">
                            <field name="VAR" id="win_count">win_count</field>
                          </block>
                        </value>
                        <value name="B">
                          <shadow type="math_number">
                            <field name="NUM">3</field>
                          </shadow>
                        </value>
                      </block>
                    </value>
                    <statement name="DO0">
                      <block type="variables_set" id="reset_count">
                        <field name="VAR" id="win_count">win_count</field>
                        <value name="VALUE">
                          <shadow type="math_number">
                            <field name="NUM">0</field>
                          </shadow>
                        </value>
                      </block>
                    </statement>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </statement>
      </block>
      <next>
        <block type="trade_again" id="trade_again"></block>
      </next>
    </statement>
  </block>
</xml>